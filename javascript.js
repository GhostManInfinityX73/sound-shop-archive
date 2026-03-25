/**
 * SOUND SHOP - Unified Shop Logic
 * Handles Intro, Digital Catalog, Physical Inventory, and Payments
 */

const introText = "With 25 years of industry experience, I specialize in crafting high-impact soundtracks. Explore the physical drop below.";
let charIndex = 0;
let shopData = null; 

// 1. Intro Typing Effect
function typeWriter() {
    const el = document.getElementById("typing-text");
    if (el && charIndex < introText.length) {
        el.innerHTML += introText.charAt(charIndex);
        charIndex++;
        setTimeout(typeWriter, 40);
    }
}

// 2. Fetch the Physical Inventory JSON
async function loadSoundShopProducts() {
    try {
        const response = await fetch('./products.json');
        if (!response.ok) throw new Error('Network response was not ok');
        shopData = await response.json();
        console.log("Sound Shop Physical Catalog Loaded:", shopData);
        renderPhysicalShop(); 
    } catch (error) {
        console.error("Error loading products.json:", error);
    }
}

// 3. Render Digital Music Tracks
function renderCatalog() {
    const container = document.getElementById('product-container');
    // Ensure 'products' array exists (likely from another JS file or global scope)
    if (container && typeof products !== 'undefined' && products.length > 0) {
        container.innerHTML = products.map(track => `
            <div class="track-card">
                <h2 style="color:#00ffcc; margin-top:0;">${track.name}</h2>
                <div class="visualizer">
                    <div class="bar"></div><div class="bar"></div><div class="bar"></div>
                    <div class="bar" style="animation-delay:0.2s"></div><div class="bar"></div>
                </div>
                <audio controls><source src="${track.file}" type="audio/mpeg"></audio>
                <button class="buy-btn" onclick="openModal('${track.name}', '${track.price}', 'digital')">
                    LICENSE FOR $${track.price}
                </button>
            </div>
        `).join('');
    }
}

// 4. Render Physical Merchandise (Hoodies, Hats, etc.)
function renderPhysicalShop() {
    const merchContainer = document.getElementById('merch-container');
    if (!merchContainer || !shopData) return;

    merchContainer.innerHTML = shopData.inventory.map(item => {
        const itemId = item.category.replace(/\s+/g, '');
        return `
            <div class="merch-card" style="border: 1px solid #444; padding: 15px; margin: 10px; border-radius: 8px; background: #111;">
                <h3 style="color: #ffcc00;">${item.category}</h3>
                <p style="color: #eee;">Weight: ${item.weight_lbs} lbs</p>
                <p style="color: #00ffcc;">Price: $${item.base_price.toFixed(2)}</p>
                
                <label for="color-${itemId}" style="color: #aaa; font-size: 0.8em;">Select Color:</label>
                <select id="color-${itemId}" style="margin-bottom: 10px; display: block; width: 100%;">
                    ${shopData.colors.map(color => `<option value="${color}">${color}</option>`).join('')}
                </select>
                
                <button class="buy-btn" onclick="openModal('${item.category}', '${item.base_price}', 'physical')">
                    ADD TO CART
                </button>
            </div>
        `;
    }).join('');
}

// 5. Unified Modal Control
function openModal(name, price, type) {
    const modal = document.getElementById('paymentModal');
    const nameEl = document.getElementById('modalTrackName');
    const priceEl = document.getElementById('modalPrice');
    const amountInput = document.getElementById('amount');

    if (nameEl) nameEl.innerText = name;
    if (priceEl) priceEl.innerText = '$' + price;
    if (amountInput) amountInput.value = price; // Syncs hidden or visible amount field

    if (modal) {
        modal.setAttribute('data-purchase-type', type);
        modal.style.display = 'flex';
        
        // Logic: Show/Hide shipping fields if it's physical merch
        const shippingSection = document.getElementById('shipping-fields');
        if (shippingSection) {
            shippingSection.style.display = (type === 'physical') ? 'block' : 'none';
        }
    }
}

function closeModal() {
    const modal = document.getElementById('paymentModal');
    if (modal) modal.style.display = 'none';
}

// 6. Payment Processing Logic
function initPaymentHandler() {
    const paymentForm = document.getElementById('payment-form');
    const submitButton = document.getElementById('submit-button');

    if (!paymentForm) return;

    paymentForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const purchaseType = document.getElementById('paymentModal').getAttribute('data-purchase-type');
        
        submitButton.disabled = true;
        submitButton.textContent = 'Processing...';

        const formData = {
            purchaseType: purchaseType,
            itemName: document.getElementById('modalTrackName').innerText,
            cardNumber: document.getElementById('card-number').value,
            expiryMonth: document.getElementById('expiry-month').value,
            expiryYear: document.getElementById('expiry-year').value,
            cvv: document.getElementById('cvv').value,
            amount: document.getElementById('amount').value
        };

        // If physical, add shipping details to the object
        if (purchaseType === 'physical') {
            formData.shippingAddress = document.getElementById('shipping-address')?.value || 'N/A';
        }

        try {
            const response = await fetch('/api/process-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                alert('Success! Transaction ID: ' + result.transactionId);
                window.location.href = '/success.html';
            } else {
                alert('Payment Failed: ' + (result.message || 'Unknown error'));
                submitButton.disabled = false;
                submitButton.textContent = 'Try Again';
            }
        } catch (error) {
            console.error('Payment Error:', error);
            alert('Connection Error. Please check your internet and try again.');
            submitButton.disabled = false;
            submitButton.textContent = 'Try Again';
        }
    });
}

// 7. Entry Point
document.addEventListener('DOMContentLoaded', () => {
    typeWriter();
    renderCatalog(); 
    loadSoundShopProducts();
    initPaymentHandler();
});
