const express = require('express');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const fs = require('fs'); 
const cors = require('cors');
const nodemailer = require('nodemailer');
const sdk = require('authorizenet').APIContracts;
const controller = require('authorizenet').APIControllers;
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// --- INITIALIZATION & VERIFICATION ---
if (!process.env.AUTH_NET_LOGIN_ID || !process.env.AUTH_NET_TRANS_KEY || !process.env.EMAIL_PASS) {
    console.error("❌ ERROR: Required credentials (.env) are missing!");
} else {
    console.log("✅ LIVE ENGINE: All Systems (Payment, Email, & Tracking) Ready.");
}

// Middleware
app.use(cors());
app.use(express.static(__dirname));
app.use(bodyParser.json({
    verify: (req, res, buf) => { req.rawBody = buf.toString(); }
}));

// --- EMAIL CONFIGURATION ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS 
    }
});

// Helper: Merchant Authentication
function getMerchantAuth() {
    const auth = new sdk.MerchantAuthenticationType();
    auth.setName(process.env.AUTH_NET_LOGIN_ID); 
    auth.setTransactionKey(process.env.AUTH_NET_TRANS_KEY);
    return auth;
}

// --- THE EMAIL DISPATCHER ---
async function sendVaultEmail(customerEmail, type, detail) {
    let subject, htmlContent;

    if (type === 'FREE') {
        subject = "🔑 YOUR VAULT KEY: Sound Shop Access";
        htmlContent = `
            <div style="background:#050505; color:#fff; padding:40px; font-family:sans-serif; border: 1px solid #00ffcc;">
                <h1 style="color:#00ffcc; letter-spacing:5px; text-transform:uppercase;">Access Granted</h1>
                <p>Welcome to the Vault. Your cinematic asset library is ready for download.</p>
                <a href="http://localhost:3000/vault.html?email=${encodeURIComponent(customerEmail)}" 
                   style="display:inline-block; padding:15px 25px; background:#00ffcc; color:#000; text-decoration:none; font-weight:bold; border-radius:50px;">
                   OPEN THE VAULT
                </a>
            </div>`;
    } else if (type === 'PRO') {
        subject = "⚡ PRO ACCESS ACTIVATED: Sound Shop";
        htmlContent = `<h1>Welcome, Pro Member</h1><p>Your subscription is active. Full commercial licensing is now tied to ${customerEmail}.</p>`;
    } else {
        subject = "📦 GEAR SECURED: Sound Shop Order";
        htmlContent = `<h1>Order Confirmed</h1><p>We're prepping your ${detail}. We'll email your tracking number shortly.</p>`;
    }

    const mailOptions = {
        from: `"Sound Shop" <${process.env.EMAIL_USER}>`,
        to: customerEmail,
        subject: subject,
        html: htmlContent
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`📧 Email sent to ${customerEmail}`);
    } catch (error) {
        console.error("❌ Email Error:", error);
    }
}

// --- 1. CATALOG ---
app.get('/api/catalog', (req, res) => {
    fs.readFile('./products.json', 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: "Catalog Error" });
        res.json(JSON.parse(data));
    });
});

// --- 2. ONE-TIME SALES (GEAR/TRACKS) ---
app.post('/checkout', (req, res) => {
    const { opaqueData: incomingOpaque, trackName, customerEmail, amount } = req.body;

    const opaqueData = new sdk.OpaqueDataType();
    opaqueData.setDataDescriptor(incomingOpaque.dataDescriptor);
    opaqueData.setDataValue(incomingOpaque.dataValue);

    const paymentType = new sdk.PaymentType();
    paymentType.setOpaqueData(opaqueData);

    const transactionRequestType = new sdk.TransactionRequestType();
    transactionRequestType.setTransactionType(sdk.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
    transactionRequestType.setPayment(paymentType);
    transactionRequestType.setAmount(amount);

    const createRequest = new sdk.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(getMerchantAuth());
    createRequest.setTransactionRequest(transactionRequestType);

    const ctrl = new controller.CreateTransactionController(createRequest.getJSON());
    ctrl.setEnvironment("https://api.authorize.net/xml/v1/request.api");

    ctrl.execute(() => {
        const apiResponse = ctrl.getResponse();
        const response = new sdk.CreateTransactionResponse(apiResponse);

        if (response != null && response.getMessages().getResultCode() === sdk.MessageTypeEnum.OK) {
            const transResponse = response.getTransactionResponse();
            if (transResponse && transResponse.getTransId()) {
                const transId = transResponse.getTransId();
                fs.appendFile('./orders.json', JSON.stringify({ transId, customerEmail, trackName, date: new Date() }) + '\n', () => {});
                sendVaultEmail(customerEmail, 'GEAR', trackName);
                res.json({ success: true, transactionId: transId });
            }
        } else {
            res.status(400).json({ success: false, error: "Transaction Declined" });
        }
    });
});

// --- 3. RECURRING SUBSCRIPTIONS (PRO) ---
app.post('/subscribe', (req, res) => {
    const { opaqueData: incomingOpaque, customerEmail, customerName } = req.body;

    const interval = new sdk.PaymentScheduleType.Interval();
    interval.setLength(1);
    interval.setUnit(sdk.ARBIntervalUnitEnum.MONTHS);

    const paymentScheduleType = new sdk.PaymentScheduleType();
    paymentScheduleType.setInterval(interval);
    paymentScheduleType.setStartDate(new Date().toISOString().substring(0, 10));
    paymentScheduleType.setTotalOccurrences(9999); 

    const opaqueData = new sdk.OpaqueDataType();
    opaqueData.setDataDescriptor(incomingOpaque.dataDescriptor);
    opaqueData.setDataValue(incomingOpaque.dataValue);

    const paymentType = new sdk.PaymentType();
    paymentType.setOpaqueData(opaqueData);

    const nameParts = (customerName || "Vault Member").split(' ');
    const customerAddress = new sdk.CustomerAddressType();
    customerAddress.setFirstName(nameParts[0]);
    customerAddress.setLastName(nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Member');

    const subscriptionType = new sdk.ARBSubscriptionType();
    subscriptionType.setName("Sound Shop Pro Membership");
    subscriptionType.setPaymentSchedule(paymentScheduleType);
    subscriptionType.setAmount(19.99);
    subscriptionType.setPayment(paymentType);
    subscriptionType.setBillTo(customerAddress);

    const createRequest = new sdk.ARBCreateSubscriptionRequest();
    createRequest.setMerchantAuthentication(getMerchantAuth());
    createRequest.setSubscription(subscriptionType);

    const ctrl = new controller.ARBCreateSubscriptionController(createRequest.getJSON());
    ctrl.setEnvironment("https://api.authorize.net/xml/v1/request.api");

    ctrl.execute(() => {
        const apiResponse = ctrl.getResponse();
        const response = new sdk.ARBCreateSubscriptionResponse(apiResponse);

        if (response != null && response.getMessages().getResultCode() === sdk.MessageTypeEnum.OK) {
            const subscriptionId = response.getSubscriptionId();
            fs.appendFile('./members.json', JSON.stringify({ subscriptionId, customerEmail, type: "PRO", date: new Date() }) + '\n', () => {});
            sendVaultEmail(customerEmail, 'PRO');
            res.json({ success: true, subscriptionId: subscriptionId });
        } else {
            res.status(400).json({ success: false, error: "Subscription Failed" });
        }
    });
});

// --- 4. FREE VAULT SIGNUPS ---
app.post('/free-signup', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: "Email Required" });

    fs.appendFile('./free_leads.json', JSON.stringify({ email, date: new Date(), type: "FREE_PASS" }) + '\n', (err) => {
        if (!err) {
            sendVaultEmail(email, 'FREE');
            res.json({ success: true });
        }
    });
});

// --- 5. WEBHOOK VERIFICATION ---
app.post('/webhook', (req, res) => {
    const authNetSignature = req.headers['x-anet-signature'];
    const SIGNATURE_KEY = process.env.AUTHORIZE_NET_SIGNATURE_KEY;
    if (SIGNATURE_KEY && authNetSignature) {
        const hash = crypto.createHmac('sha512', SIGNATURE_KEY).update(req.rawBody).digest('hex').toUpperCase();
        if (`sha512=${hash}` !== authNetSignature.toUpperCase()) return res.status(401).send('Invalid Signature');
    }
    res.status(200).send('Verified');
});

// --- 6. ACTIVITY TRACKER & LOGGING (WITH LOCATION) ---
app.post('/api/log-activity', async (req, res) => {
    const { email, action, item } = req.body;
    
    // Get the user's IP address
    const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    let locationString = "Unknown Location";

    try {
        // Fetch location data based on the IP
        const geoResponse = await fetch(`https://ipapi.co/${userIp}/json/`);
        const locationData = await geoResponse.json();
        
        if (locationData.city && locationData.country_name) {
            locationString = `${locationData.city}, ${locationData.region}, ${locationData.country_name}`;
        }
    } catch (err) {
        console.error("🌐 Location lookup failed, defaulting to Unknown.");
    }

    const logEntry = {
        timestamp: new Date().toLocaleString(),
        email: email || "Guest",
        action: action || "View",
        item: item || "Unknown",
        location: locationString
    };

    // Save to the JSON file
    fs.appendFile('./activity_log.json', JSON.stringify(logEntry) + '\n', (err) => {
        if (err) console.error("❌ Log File Error:", err);
    });

    // Console Output for your Termux session
    console.log(`\n🔔 [ACTIVITY] ${logEntry.timestamp}`);
    console.log(`👤 USER: ${logEntry.email} (${locationString})`);
    console.log(`🎯 ACTION: ${logEntry.action} -> ${logEntry.item}\n`);

    res.status(200).send('Logged');
});

app.listen(port, () => console.log(`🚀 SOUND SHOP ENGINE: ONLINE ON PORT ${port} 🚀`));
