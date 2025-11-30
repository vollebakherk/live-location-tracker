// zoeker-game.js - Specifiek voor zoeker.html
console.log('🎯 Zoeker game wordt geladen...');

let socket, map, markers = {};
let watchId = null;
let playerName = '';
let TRACKER_ID = '';
let vosLocation = null;

const zoekerNamen = [
    "Speurder", "Jager", "Verkenner", "Trackster", "Zoekertje", 
    "Speurneus", "Jachtluipaard", "Spoorzoeker", "Detective", "Scout"
];

waitForSocketIO(function() {
    console.log('🚀 Start zoeker initialisatie...');
    initializeZoekerGame();
});

function initializeZoekerGame() {
    try {
        socket = io();
        map = initializeMap();
        
        // Genereer zoeker ID en naam
        TRACKER_ID = 'zoeker-' + Math.random().toString(36).substr(2, 8);
        const randomNaam = zoekerNamen[Math.floor(Math.random() * zoekerNamen.length)];
        const randomNummer = Math.floor(Math.random() * 99) + 1;
        playerName = `${randomNaam}${randomNummer}`;
        document.getElementById('playerNameDisplay').textContent = playerName;

        console.log('👤 Zoeker:', playerName, 'ID:', TRACKER_ID);

        initializeSocketHandlers(socket, {
            onConnect: () => {
                document.getElementById('status').innerHTML = '🟢 Verbonden - wacht op vos...';
            },
            onVosStatus: handleVosStatus,
            onLocationUpdate: handleLocationUpdate,
            onError: handleError
        });

        // Maak functies globaal beschikbaar
        window.startSharing = startSharing;
        window.stopSharing = stopSharing;
        window.centerOnVos = centerOnVos;
        window.resetView = resetView;

        console.log('✅ Zoeker game klaar!');
        
    } catch (error) {
        console.error('💥 Error in zoeker game:', error);
        document.getElementById('status').innerHTML = 
            `<div class="error">Zoeker error: ${error.message}</div>`;
    }
}

function handleVosStatus(data) {
    console.log('🦊 Vos status:', data);
    if (data.hasVos) {
        document.getElementById('status').innerHTML = 
            `<div class="vos-alert">🦊 VOS ACTIEF: ${data.vosName} - Ga op jacht!</div>`;
    } else {
        document.getElementById('status').innerHTML = 
            '🟡 Wacht op vos... Er is nog geen vos actief.';
    }
}

function handleLocationUpdate(location) {
    updateMap(location);
    if (location.isVos) {
        vosLocation = location;
        updateVosDistance();
    }
}

function handleError(message) {
    console.error('❌ Socket error:', message);
    document.getElementById('status').innerHTML = 
        `<div class="error">${message}</div>`;
}

function updateMap(location) {
    const markerId = location.trackerId;
    
    if (markers[markerId]) {
        map.removeLayer(markers[markerId]);
    }

    const iconType = location.isVos ? createVosIcon() : createZoekerIcon();
    const popupText = location.isVos 
        ? `<b>🦊 DE VOS!</b><br>${location.name}<br><small>Ga hem vangen!</small>` 
        : `<b>👤 ${location.name}</b><br><small>Mede-zoeker</small>`;

    markers[markerId] = L.marker([location.lat, location.lng], { 
        icon: iconType 
    })
    .addTo(map)
    .bindPopup(popupText);

    // VOS: Alleen eerste keer centreren
    if (location.isVos && !window.vosIsGecentreerd) {
        map.setView([location.lat, location.lng], 14);
        window.vosIsGecentreerd = true;
        console.log('🗺️ Eerste keer vos gecentreerd');
    }
}

function updateVosDistance() {
    if (!vosLocation || !markers[TRACKER_ID]) return;
    
    const zoekerLoc = markers[TRACKER_ID].getLatLng();
    const distance = calculateDistance(
        zoekerLoc.lat, zoekerLoc.lng,
        vosLocation.lat, vosLocation.lng
    );
    
    const distanceText = distance < 1000 
        ? `${Math.round(distance)} meter` 
        : `${(distance/1000).toFixed(1)} km`;
        
    document.getElementById('status').innerHTML = 
        `<div class="vos-alert">
            🦊 VOS GEVONDEN! - ${distanceText} van jou
         </div>`;
}

// Globale functies voor buttons
function startSharing() {
    console.log('📍 Start zoeken clicked');
    
    if (!navigator.geolocation) {
        alert('Geolocatie wordt niet ondersteund door je browser');
        return;
    }

    document.getElementById('status').innerHTML = 
        '<span style="color: #2ecc71;">🔴 ZOEKEN LIVE - Je ziet alle spelers</span>';

    navigator.geolocation.getCurrentPosition(
        (position) => {
            sendLocationToServer(position);
            startWatching();
        },
        (error) => {
            handleLocationError(error);
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

function stopSharing() {
    console.log('⏹️ Stop zoeken');
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    document.getElementById('status').innerHTML = '⏹️ Zoeken gestopt';
    
    if (markers[TRACKER_ID]) {
        map.removeLayer(markers[TRACKER_ID]);
        delete markers[TRACKER_ID];
    }
}

function centerOnVos() {
    if (vosLocation) {
        map.setView([vosLocation.lat, vosLocation.lng], 14);
        console.log('🎯 Handmatig gecentreerd op vos');
    } else {
        alert('Nog geen vos gevonden!');
    }
}

function resetView() {
    map.setView([50.9010206, 5.3104384], 13);
    window.vosIsGecentreerd = false;
    console.log('🗺️ Weergave gereset');
}

function startWatching() {
    watchId = navigator.geolocation.watchPosition(
        sendLocationToServer,
        handleLocationError,
        { 
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 1000
        }
    );
}

function sendLocationToServer(position) {
    const locationData = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        trackerId: TRACKER_ID,
        name: playerName,
        type: "zoeker"
    };

    console.log('👤 Zoeker locatie:', locationData);
    socket.emit('updateLocation', locationData);
    
    updateOwnMarker(locationData);
}

function updateOwnMarker(location) {
    if (markers[TRACKER_ID]) {
        map.removeLayer(markers[TRACKER_ID]);
    }

    markers[TRACKER_ID] = L.marker([location.lat, location.lng], { 
        icon: createZoekerIcon() 
    })
    .addTo(map)
    .bindPopup(`<b>👤 Jij (${playerName})</b><br>Je bent op zoek naar de vos!`);
}

function handleLocationError(error) {
    console.error('Locatie fout:', error);
    let message = 'Locatie fout: ';
    switch(error.code) {
        case error.PERMISSION_DENIED:
            message += 'Toegang geweigerd. Sta locatie toe in browser instellingen.';
            break;
        case error.POSITION_UNAVAILABLE:
            message += 'Locatie informatie niet beschikbaar.';
            break;
        case error.TIMEOUT:
            message += 'Locatie request timeout.';
            break;
        default:
            message += 'Onbekende fout.';
    }
    document.getElementById('status').innerHTML = 
        `<span style="color: #e74c3c;">❌ ${message}</span>`;
}
