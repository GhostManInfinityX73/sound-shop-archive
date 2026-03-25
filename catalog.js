document.addEventListener('DOMContentLoaded', () => {
    const beatsContainer = document.querySelector('.beats-container') || document.body;
    const loadingText = document.querySelector('p');
    if (loadingText) loadingText.style.display = 'none';

    const beats = [
        { id: "tgg_01", title: "Grudge Gobbler", file: "audio/grudgegobbler.m4a", price: "29.99" },
        { id: "ct_02", title: "Cinematic Theme", file: "audio/cinematic-theme.mp3", price: "29.99" }
    ];

    beats.forEach(beat => {
        const beatElement = document.createElement('div');
        beatElement.className = "beat-card";
        beatElement.style = "border: 1px solid #333; margin: 15px 0; padding: 15px; border-radius: 8px;";
        
        beatElement.innerHTML = `
            <h3>${beat.title}</h3>
            <audio controls style="width: 100%;">
                <source src="${beat.file}" type="audio/mpeg">
                <source src="${beat.file}" type="audio/mp4">
            </audio>
            <p><strong>Price: $${beat.price}</strong></p>
            <button onclick="location.href='checkout.html?item=${beat.id}&price=${beat.price}'" 
                    style="background: #28a745; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">
                Purchase License
            </button>
        `;
        beatsContainer.appendChild(beatElement);
    });

    // Add a Footer Link for Terms
    const footer = document.createElement('footer');
    footer.innerHTML = `<hr><p style="text-align:center;"><a href="terms.html">View Our Terms of Service & Business Policy</a></p>`;
    document.body.appendChild(footer);
});
