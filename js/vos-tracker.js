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

        initializeSocketHandlers(socket, {
            onVosStatus: handleVosStatus,
            onVosSuccess: handleVosSuccess,
            onError: handleError
        });

        console.log('✅ Vos tracker klaar!');
        
    } catch (error) {
        console.error('💥 Error in vos tracker:', error);
        document.getElementById('passwordStatus').innerHTML = 
            `<div class="error">Tracker error: ${error.message}</div>`;
    }
}

function handleVosStatus(data) {
    if (data.hasVos && !isVos) {
        document.getElementById('passwordSection').innerHTML = `
            <h3>❌ Er is al een vos!</h3>
            <p>${data.vosName} is momenteel de vos.</p>
            <p>Wacht tot de vos stopt of probeer het later opnieuw.</p>
        `;
    }
}

function handleVosSuccess(data) {
    isVos = true;
    document.getElementById('passwordSection').style.display = 'none';
    document.getElementById('controlsSection').style.display = 'block';
    document.getElementById('passwordStatus').innerHTML = 
        `<div class="success">${data.message}</div>`;
}

function handleError(message) {
    document.getElementById('passwordStatus').innerHTML = 
        `<div class="error">${message}</div>`;
}

// ... rest van de tracker-specifieke functies
