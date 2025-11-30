// viewer-overview.js - Specifiek voor index.html (overzicht)
console.log('🎯 Viewer overview wordt geladen...');

let socket, map;
const markers = {};

waitForSocketIO(function() {
    console.log('🚀 Start viewer initialisatie...');
    initializeViewerOverview();
});

function initializeViewerOverview() {
    try {
        socket = io();
        map = initializeMap();

        initializeSocketHandlers(socket, {
            onLocationUpdate: handleLocationUpdate,
            onVosStatus: handleVosStatus
        });

        console.log('✅ Viewer overview klaar!');
        
    } catch (error) {
        console.error('💥 Error in viewer overview:', error);
        document.getElementById('status').innerHTML = 
            `<div class="error">Viewer error: ${error.message}</div>`;
    }
}

function handleLocationUpdate(location) {
    const markerId = location.trackerId;
    
    if (markers[markerId]) {
        map.removeLayer(markers[markerId]);
    }

    const iconType = location.isVos ? createVosIcon() : createZoekerIcon();
    const popupText = location.isVos 
        ? `<b>🦊 DE VOS!</b><br>${location.name}` 
        : `<b>👤 ${location.name}</b>`;

    markers[markerId] = L.marker([location.lat, location.lng], { icon: iconType })
        .addTo(map)
        .bindPopup(popupText);

    // OVERZICHT: Nooit automatisch centreren
}

function handleVosStatus(data) {
    document.getElementById('vosStatus').innerHTML = data.hasVos 
        ? `<span style="color: #e74c3c;">🦊 Vos: ${data.vosName}</span>`
        : '<span style="color: #95a5a6;">Geen vos actief</span>';
}

// Globale functies voor buttons
window.fitAllMarkers = function() {
    const group = new L.featureGroup();
    Object.values(markers).forEach(marker => {
        group.addLayer(marker);
    });
    if (group.getLayers().length > 0) {
        map.fitBounds(group.getBounds().pad(0.1));
    }
}

window.resetView = function() {
    map.setView([50.9010206, 5.3104384], 13);
}
