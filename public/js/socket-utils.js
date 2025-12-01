/ socket-utils.js - Verbeterde Socket.io helper functies
let socket = null;
let locationTracker = null;

function waitForSocketIO(callback) {
    if (typeof io !== 'undefined') {
        console.log('✅ Socket.io is geladen!');
        callback();
    } else {
        console.log('⏳ Wacht op socket.io...');
        setTimeout(function() {
            waitForSocketIO(callback);
        }, 100);
    }
}

function connectSocket(serverUrl, handlers) {
    socket = io(serverUrl);
    
    socket.on('connect', () => {
        console.log('✅ Verbonden met server! Socket ID:', socket.id);
        if (handlers.onConnect) handlers.onConnect(socket.id);
        
        // Start locatie tracking na connectie
        if (locationTracker) {
            locationTracker.startTracking(socket);
        }
    });

    socket.on('vosStatus', (data) => {
        console.log('🦊 Vos status:', data);
        if (handlers.onVosStatus) handlers.onVosStatus(data);
    });

    socket.on('vosSuccess', (data) => {
        console.log('✅ Vos geworden:', data);
        if (handlers.onVosSuccess) handlers.onVosSuccess(data);
    });

    socket.on('locationUpdate', (data) => {
        // Valideer en format positie
        if (data.position) {
            data.position = LocationUtils.formatPosition(data.position);
        }
        console.log('📍 Locatie ontvangen:', data.trackerId, data.isVos ? '(VOS)' : '');
        if (handlers.onLocationUpdate) handlers.onLocationUpdate(data);
    });

    socket.on('playersNearby', (nearbyPlayers) => {
        console.log('👥 Spelers in de buurt:', nearbyPlayers);
        if (handlers.onPlayersNearby) handlers.onPlayersNearby(nearbyPlayers);
    });

    socket.on('error', (message) => {
        console.error('❌ Socket error:', message);
        if (handlers.onError) handlers.onError(message);
    });
    
    return socket;
}

function sendLocation(position) {
    if (socket && socket.connected) {
        const formattedPos = LocationUtils.formatPosition(position);
        socket.emit('updateLocation', {
            lat: formattedPos.lat,
            lng: formattedPos.lng,
            accuracy: position.accuracy || 10,
            timestamp: Date.now()
        });
        return true;
    }
    return false;
}

function setLocationTracker(tracker) {
    locationTracker = tracker;
}

function getSocket() {
    return socket;
}
