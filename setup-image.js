// Script to load the MRT map image
document.addEventListener('DOMContentLoaded', function() {
    const mapImg = document.getElementById('mrt-map-base');

    // Replace this with your actual MRT map image path
    // Save your MRT map image as "singapore-mrt-map.png" in this directory
    mapImg.src = 'singapore-mrt-map.png';

    mapImg.onerror = function() {
        // Fallback if image not found - create a simple text placeholder
        mapImg.style.display = 'none';
        const container = mapImg.parentElement;
        const placeholder = document.createElement('div');
        placeholder.style.cssText = `
            width: 100%;
            height: 400px;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 18px;
            text-align: center;
            border-radius: 8px;
            border: 2px dashed #666;
        `;
        placeholder.innerHTML = `
            <div>
                <h3>🚇 Singapore MRT Map</h3>
                <p style="margin-top: 10px; opacity: 0.8;">Place your MRT map image here as "singapore-mrt-map.png"</p>
                <p style="margin-top: 5px; font-size: 14px; opacity: 0.6;">The detailed map with all stations will appear here</p>
            </div>
        `;
        container.insertBefore(placeholder, mapImg);
    };

    mapImg.onload = function() {
        // Image loaded successfully
        console.log('MRT map loaded successfully');
        // You can add station coordinates overlays here based on the actual image
        addStationCoordinates();
    };
});

function addStationCoordinates() {
    // Update station coordinates based on actual map image
    // These coordinates should be updated to match your actual MRT map image
    const updatedCoordinates = {
        "bayfront": { x: "75%", y: "85%" },
        "marina-bay": { x: "78%", y: "88%" },
        "raffles-place": { x: "70%", y: "82%" },
        "city-hall": { x: "68%", y: "78%" },
        "clarke-quay": { x: "65%", y: "75%" },
        "chinatown": { x: "62%", y: "82%" },
        "bugis": { x: "72%", y: "72%" },
        "orchard": { x: "55%", y: "65%" },
        "sentosa": { x: "60%", y: "95%" }
    };

    // Apply coordinates to the overlay SVG
    const overlay = document.getElementById('mrt-map-overlay');
    if (overlay) {
        // Station markers will be positioned based on these percentages
        window.stationCoordinates = updatedCoordinates;
    }
}