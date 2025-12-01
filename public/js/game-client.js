// game-client.js - Hoofd game logica met verbeterde precisie
let map = null;
let playerMarkers = {};
let currentPlayerId = null;
let isVos = false;
let myPosition = null;

// Initialisatie
document.addEventListener('DOMContentLoaded', function() {
    initGame();
});

function initGame() {
    console.log('🎮 Game initialiseren...');
    
    // 1. Initialiseer kaart
    map = initializeMap();
    console.log('🗺️ Kaart geladen');
    
    // 2. Wacht op socket.io
    waitForSocketIO(() => {
        console.log('🔌 Socket.io beschikbaar, verbinden...');
        
        // 3. Maak socket verbinding
        const socket = connectSocket('http://localhost:3000', {
            onConnect: (socketId) => {
                currentPlayerId = socketId;
                console.log('✅ Verbonden! Mijn ID:', socketId);
                
                // 4. Start locatie tracking
                initLocationTracking(socket);
                
                // 5. Toon eigen locatie op kaart
                showMyLocation();
            },
            
            onLocationUpdate: (data) => {
                console.log('📍 Update van speler:', data.trackerId);
                
                // Update marker op kaart
                updatePlayerMarker(data.trackerId, data.position, data.isVos);
                
                // Check of deze speler bij mij staat
                if (data.trackerId !== currentPlayerId && myPosition) {
                    checkIfPlayersTogether(myPosition, data.position, data.trackerId);
                }
            },
            
            onVosStatus: (data) => {
                isVos = data.isVos;
                console.log(isVos ? '🦊 Jij bent nu de VOS!' : '👤 Jij bent een zoeker');
                updateMyMarkerIcon();
            },
            
            onPlayersNearby: (players) => {
                updateNearbyPlayersUI(players);
            }
        });
    });
}

function initLocationTracking(socket) {
    if (!navigator.geolocation) {
        alert('Geolocatie wordt niet ondersteund');
        return;
    }
    
    const options = LocationUtils.getGPSOptions();
    let lastSentPos = null;
    
    console.log('📍 GPS tracking starten...');
    
    navigator.geolocation.watchPosition(
        (position) => {
            const coords = position.coords;
            
            if (!LocationUtils.isValidPosition(coords)) {
                return;
            }
            
            // Formatteer met hoge precisie
            const newPos = LocationUtils.formatPosition(coords.latitude, coords.longitude);
            myPosition = newPos;
            
            console.log(`📡 GPS: ${newPos.lat.toFixed(7)}, ${newPos.lng.toFixed(7)} 
                       (accuraatheid: ${coords.accuracy ? coords.accuracy.toFixed(1) + 'm' : '?'})`);
            
            // Stuur alleen bij voldoende beweging (> 1 meter)
            if (!lastSentPos || 
                calculateDistance(
                    newPos.lat, newPos.lng,
                    lastSentPos.lat, lastSentPos.lng
                ) > 1) {
                
                sendLocation({
                    lat: newPos.lat,
                    lng: newPos.lng,
                    accuracy: coords.accuracy
                });
                
                lastSentPos = newPos;
                
                // Update eigen marker
                updatePlayerMarker(currentPlayerId, newPos, isVos);
            }
        },
        (error) => {
            console.error('GPS Error:', error);
        },
        options
    );
}

function updatePlayerMarker(playerId, position, isVosPlayer = false) {
    if (!position || !map) return;
    
    const formattedPos = LocationUtils.formatPosition(position.lat, position.lng);
    
    // Verwijder bestaande marker
    if (playerMarkers[playerId]) {
        map.removeLayer(playerMarkers[playerId]);
    }
    
    // Maak nieuwe marker
    const icon = isVosPlayer ? createVosIcon() : createZoekerIcon();
    const marker = L.marker([formattedPos.lat, formattedPos.lng], { icon });
    
    // Voeg accuracy circle toe voor visualisatie
    const accuracy = position.accuracy || 15;
    const accuracyCircle = L.circle([formattedPos.lat, formattedPos.lng], {
        radius: accuracy,
        fillColor: isVosPlayer ? '#e74c3c' : '#3498db',
        color: isVosPlayer ? '#c0392b' : '#2980b9',
        weight: 1,
        opacity: 0.3,
        fillOpacity: 0.1
    });
    
    // Tooltip met info
    marker.bindTooltip(`
        ${isVosPlayer ? '🦊 VOS' : '👤 Zoeker'} ${playerId.substring(0, 6)}<br>
        Accuraatheid: ${accuracy.toFixed(1)}m
    `, { permanent: false, direction: 'top' });
    
    // Voeg toe aan kaart
    marker.addTo(map);
    accuracyCircle.addTo(map);
    
    // Sla op
    playerMarkers[playerId] = marker;
    
    // Als het mijn marker is, centreer kaart
    if (playerId === currentPlayerId) {
        map.setView([formattedPos.lat, formattedPos.lng], map.getZoom());
    }
}

function checkIfPlayersTogether(myPos, otherPos, otherPlayerId) {
    const distance = LocationUtils.calculateDistance(
        myPos.lat, myPos.lng,
        otherPos.lat, otherPos.lng
    );
    
    console.log(`📏 Afstand tot ${otherPlayerId.substring(0, 6)}: ${distance.toFixed(2)}m`);
    
    if (distance <= LocationUtils.TOGETHER_THRESHOLD) {
        showTogetherNotification(otherPlayerId, distance);
        highlightPlayerMarker(otherPlayerId);
    }
}

function showTogetherNotification(playerId, distance) {
    console.log(`🎉 SPELER BIJ JE! ${playerId.substring(0, 6)} (${distance.toFixed(1)}m)`);
    
    // Visuele feedback
    const notification = document.createElement('div');
    notification.className = 'together-notification';
    notification.innerHTML = `
        <div style="
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #2ecc71;
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            z-index: 1000;
            font-weight: bold;
            animation: pulse 2s infinite;
        ">
            👥 Speler in de buurt! (${distance.toFixed(1)}m)
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Verwijder na 3 seconden
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

function highlightPlayerMarker(playerId) {
    const marker = playerMarkers[playerId];
    if (marker) {
        // Pulse animatie
        marker.setZIndexOffset(1000);
        
        // Reset na 2 seconden
        setTimeout(() => {
            marker.setZIndexOffset(0);
        }, 2000);
    }
}

function showMyLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const pos = LocationUtils.formatPosition(
                    position.coords.latitude, 
                    position.coords.longitude
                );
                myPosition = pos;
                
                // Centreer kaart
                map.setView([pos.lat, pos.lng], 16);
                
                // Toon marker
                updatePlayerMarker(currentPlayerId, pos, isVos);
            },
            (error) => {
                console.error('Locatie ophalen mislukt:', error);
            },
            { enableHighAccuracy: true }
        );
    }
}

function updateMyMarkerIcon() {
    if (myPosition) {
        updatePlayerMarker(currentPlayerId, myPosition, isVos);
    }
}

function updateNearbyPlayersUI(players) {
    const container = document.getElementById('nearby-players');
    if (!container) return;
    
    container.innerHTML = '<h3>Spelers in de buurt:</h3>';
    
    if (players.length === 0) {
        container.innerHTML += '<p>Geen spelers in de buurt</p>';
        return;
    }
    
    players.forEach(player => {
        const div = document.createElement('div');
        div.className = 'nearby-player';
        div.innerHTML = `
            <span>${player.id.substring(0, 8)}</span>
            <span class="distance">${player.distance.toFixed(1)}m</span>
        `;
        container.appendChild(div);
    });
}

// Debug functie
window.debugGame = function() {
    console.log('=== GAME DEBUG INFO ===');
    console.log('Mijn ID:', currentPlayerId);
    console.log('Mijn positie:', myPosition);
    console.log('Is Vos:', isVos);
    console.log('Aantal markers:', Object.keys(playerMarkers).length);
    
    Object.keys(playerMarkers).forEach(id => {
        if (id !== currentPlayerId) {
            const marker = playerMarkers[id];
            const pos = marker.getLatLng();
            if (myPosition) {
                const dist = calculateDistance(
                    myPosition.lat, myPosition.lng,
                    pos.lat, pos.lng
                );
                console.log(`Afstand tot ${id.substring(0, 6)}: ${dist.toFixed(2)}m`);
            }
        }
    });
};

// Voeg CSS toe voor animaties
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% { transform: translateX(-50%) scale(1); }
        50% { transform: translateX(-50%) scale(1.05); }
        100% { transform: translateX(-50%) scale(1); }
    }
    
    .nearby-player {
        display: flex;
        justify-content: space-between;
        padding: 8px;
        margin: 5px;
        background: #f8f9fa;
        border-radius: 5px;
        border-left: 4px solid #3498db;
    }
    
    .nearby-player .distance {
        font-weight: bold;
        color: #2ecc71;
    }
    
    #nearby-players {
        position: fixed;
        top: 10px;
        right: 10px;
        background: white;
        padding: 15px;
        border-radius: 10px;
        box-shadow: 0 3px 15px rgba(0,0,0,0.2);
        max-width: 250px;
        z-index: 1000;
    }
`;
document.head.appendChild(style);
