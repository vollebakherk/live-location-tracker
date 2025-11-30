const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Sla locatie op
let currentLocation = {
    lat: 50.9010206,
    lng: 5.3104384,
    accuracy: 0,
    timestamp: null,
    name: "Jouw Naam" // Verander dit!
};

// Serveer statische bestanden
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'viewer.html'));
});

app.get('/tracker', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'tracker.html'));
});

// Socket.io voor real-time updates
io.on('connection', (socket) => {
    console.log('Nieuwe viewer verbonden');

    // Stuur direct de huidige locatie
    socket.emit('locationUpdate', currentLocation);

    socket.on('updateLocation', (data) => {
        // Update locatie wanneer tracker stuurt
        currentLocation = {
            ...data,
            timestamp: new Date()
        };

        // Stuur naar ALLE viewers
        io.emit('locationUpdate', currentLocation);
        console.log('Locatie bijgewerkt:', currentLocation);
    });

    socket.on('disconnect', () => {
        console.log('Viewer verbroken');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`👀 Viewers: http://localhost:${PORT}`);
    console.log(`📍 Tracker: http://localhost:${PORT}/tracker`);
});