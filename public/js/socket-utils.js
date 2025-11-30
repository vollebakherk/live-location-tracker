// socket-utils.js - Socket.io helper functies
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

function initializeSocketHandlers(socket, handlers) {
    socket.on('connect', () => {
        console.log('✅ Verbonden met server! Socket ID:', socket.id);
        if (handlers.onConnect) handlers.onConnect();
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
        console.log('📍 Locatie ontvangen:', data.trackerId, data.isVos ? '(VOS)' : '');
        if (handlers.onLocationUpdate) handlers.onLocationUpdate(data);
    });

    socket.on('error', (message) => {
        console.error('❌ Socket error:', message);
        if (handlers.onError) handlers.onError(message);
    });
}
