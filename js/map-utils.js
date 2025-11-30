// map-utils.js - Algemene kaart functies
function initializeMap(centerLat = 50.9010206, centerLng = 5.3104384, zoom = 13) {
    const map = L.map('map').setView([centerLat, centerLng], zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);
    return map;
}

function createVosIcon() {
    return L.divIcon({
        className: 'vos-icon',
        html: `
            <div style="
                background: #e74c3c;
                width: 25px;
                height: 25px;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 0 15px rgba(231, 76, 60, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                color: white;
                font-size: 12px;
            ">🦊</div>
        `,
        iconSize: [31, 31],
        iconAnchor: [15, 15]
    });
}

function createZoekerIcon() {
    return L.divIcon({
        className: 'zoeker-icon',
        html: `
            <div style="
                background: #3498db;
                width: 22px;
                height: 22px;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 0 10px rgba(52, 152, 219, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                color: white;
                font-size: 10px;
            ">👤</div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
    });
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}
