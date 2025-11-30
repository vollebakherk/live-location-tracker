// vos-tracker.js - Specifiek voor tracker.html
console.log('🎯 Vos tracker wordt geladen...');

let socket, map, currentMarker, accuracyCircle;
let watchId = null;
let isVos = false;
const TRACKER_ID = 'vos-' + Math.random().toString(36).substr(2, 5);

waitForSocketIO(function() {
    console.log('🚀 Start vos tracker initialisatie...');
    initializeVosTracker();
});

function initializeVosTracker() {
    try {
        socket = io();
        map = initializeMap();
        const vosIcon = createVosIcon();

        console.log('🆔 Vos Tracker ID:', TRACKER_ID);

        initializeSocketHandlers(socket, {
            onConnect: () => {
                console.log('✅ Verbonden met server!');
            },
            onVosStatus: handleVosStatus,
            onVosSuccess: handleVosSuccess,
            onError: handleError
        });

        // Maak functies GLOBAAL beschikbaar voor buttons
        window.becomeVos = becomeVos;
        window.stopBeingVos = stopBeingVos;
        window.startSharing = startSharing;
        window.stopSharing = stopSharing;

        console.log('✅ Vos tracker klaar!');
        
    } catch (error) {
        console.error('💥 Error in vos tracker:', error);
        document.getElementById('passwordStatus').innerHTML = 
            `<div class="error">Tracker error: ${error.message}</div>`;
    }
}

function handleVosStatus(data) {
    console.log('🦊 Vos status:', data);
    if (data.hasVos && !isVos) {
        document.getElementById('passwordSection').innerHTML = `
            <h3>❌ Er is al een vos!</h3>
            <p>${data.vosName} is momenteel de vos.</p>
            <p>Wacht tot de vos stopt of probeer het later opnieuw.</p>
        `;
    }
}

function handleVosSuccess(data) {
    console.log('✅ Vos geworden:', data);
    isVos = true;
    document.getElementById('passwordSection').style.display = 'none';
    document.getElementById('controlsSection').style.display = 'block';
    document.getElementById('passwordStatus').innerHTML = 
        `<div class="success">${data.message}</div>`;
}

function handleError(message) {
    console.error('❌ Socket error:', message);
    document.getElementById('passwordStatus').innerHTML = 
        `<div class="error">${message}</div>`;
}

// FUNCTIES VOOR BUTTONS - moeten GLOBAAL zijn
function becomeVos() {
    console.log('🦊 Word vos clicked');
    const password = document.getElementById('passwordInput').value;
    const playerName = document.getElementById('playerName').value || 'Anonieme Vos';
    
    if (!password) {
        document.getElementById('passwordStatus').innerHTML = 
            '<div class="error">Voer een wachtwoord in</div>';
        return;
    }

    console.log('🦊 Vos aanvraag:', { playerName, TRACKER_ID });
    
    socket.emit('becomeVos', {
        password: password,
        trackerId: TRACKER_ID,
        name: playerName
    });
}

function stopBeingVos() {
    console.log('🦊 Stop als vos');
    socket.emit('stopVos');
    isVos = false;
    document.getElementById('passwordSection').style.display = 'block';
    document.getElementById('controlsSection').style.display = 'none';
    document.getElementById('passwordSection').innerHTML = `
        <h3>🔐 Word de Vos</h3>
        <input type="password" id="passwordInput" placeholder="Voer vos wachtwoord in">
        <input type="text" id="playerName" placeholder="Jouw naam">
        <button onclick="becomeVos()">🦊 Word de Vos</button>
        <div id="passwordStatus"></div>
    `;
    document.getElementById('status').innerHTML = 'Je bent geen vos meer';
}

function startSharing() {
    console.log('📍 Start sharing clicked, isVos:', isVos);
    
    if (!isVos) {
        alert('Je moet eerst de vos worden!');
        return;
    }

    if (!navigator.geolocation) {
        alert('Geolocatie niet ondersteund');
        return;
    }

    document.getElementById('status').innerHTML = 
        '<span style="color: #2ecc71;">🔴 VOS LIVE - Ren maar hard!</span>';

    navigator.geolocation.getCurrentPosition(sendLocationToServer);
    watchId = navigator.geolocation.watchPosition(
        sendLocationToServer,
        handleLocationError,
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
}

function stopSharing() {
    console.log('⏹️ Stop sharing');
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    document.getElementById('status').innerHTML = '⏹️ Vos tracking gestopt';
}

function sendLocationToServer(position) {
    if (!isVos) {
        console.log('❌ Niet vos, locatie niet verzonden');
        return;
    }

    const locationData = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        trackerId: TRACKER_ID,
        name: document.getElementById('playerName')?.value || 'De Vos',
        type: "vos"
    };

    console.log('📍 Stuur vos locatie:', locationData);
    socket.emit('updateLocation', locationData);
    updateOwnMap(locationData);
}

function updateOwnMap(location) {
    console.log('🗺️ Update eigen kaart:', location);
    
    if (currentMarker) map.removeLayer(currentMarker);
    if (accuracyCircle) map.removeLayer(accuracyCircle);

    currentMarker = L.marker([location.lat, location.lng], { 
        icon: createVosIcon() 
    })
    .addTo(map)
    .bindPopup(`<b>🦊 Jij bent de vos!</b><br>Ren maar hard!`)
    .openPopup();

    accuracyCircle = L.circle([location.lat, location.lng], {
        color: '#e74c3c',
        fillColor: '#e74c3c',
        fillOpacity: 0.1,
        radius: location.accuracy
    }).addTo(map);

    // ALLEEN centreren bij eerste update, daarna niet meer
    if (!window.kaartIsGecentreerd) {
        map.setView([location.lat, location.lng], 16);
        window.kaartIsGecentreerd = true;
        console.log('🗺️ Eerste keer kaart gecentreerd op vos');
    }
}

function handleLocationError(error) {
    console.error('❌ Locatie fout:', error);
    document.getElementById('status').innerHTML = 
        '<span style="color: #e74c3c;">❌ Locatie fout: ' + error.message + '</span>';
}
// Voeg toe aan vos-tracker.js (na de andere functies)

function handleLocationUpdate(location) {
    // Als het niet de vos zelf is, toon de marker
    if (location.trackerId !== TRACKER_ID) {
        updateOtherPlayerMarker(location);
    }
}

function updateOtherPlayerMarker(location) {
    const markerId = location.trackerId;
    
    // Verwijder oude marker als die er is
    if (window.otherMarkers && window.otherMarkers[markerId]) {
        map.removeLayer(window.otherMarkers[markerId]);
    }
    
    // Maak otherMarkers object als het niet bestaat
    if (!window.otherMarkers) {
        window.otherMarkers = {};
    }
    
    // Bepaal icon type
    const iconType = location.isVos ? createVosIcon() : createZoekerIcon();
    const popupText = location.isVos 
        ? `<b>🦊 DE VOS?!</b><br>${location.name}<br><small>Hoe kan dit? Er kan maar 1 vos zijn!</small>` 
        : `<b>👤 ${location.name}</b><br><small>Zoeker - afstand: ${calculateDistanceToPlayer(location)}m</small>`;
    
    // Voeg marker toe
    window.otherMarkers[markerId] = L.marker([location.lat, location.lng], { 
        icon: iconType 
    })
    .addTo(map)
    .bindPopup(popupText);
    
    console.log('👤 Andere speler toegevoegd:', location.name);
}

function calculateDistanceToPlayer(otherLocation) {
    if (!currentMarker) return '?';
    
    const vosLocation = currentMarker.getLatLng();
    const distance = calculateDistance(
        vosLocation.lat, vosLocation.lng,
        otherLocation.lat, otherLocation.lng
    );
    
    return Math.round(distance);
}
