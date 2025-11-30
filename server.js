const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Store active trackers
const activeTrackers = new Map();
let currentVos = null;
const VOS_PASSWORD = 'vos123'; // Wachtwoord om vos te worden

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/tracker', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'tracker.html'));
});

app.get('/zoeker', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'zoeker.html'));
});

// API endpoints
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        activeTrackers: activeTrackers.size,
        currentVos: currentVos,
        timestamp: new Date().toISOString()
    });
});

// Socket.io for real-time communication
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // Stuur direct de huidige vos status
    socket.emit('vosStatus', { 
        hasVos: !!currentVos, 
        vosName: currentVos?.name || null 
    });
    
    // Stuur alle actieve trackers naar nieuwe client
    activeTrackers.forEach((tracker) => {
        socket.emit('locationUpdate', tracker);
    });
    
    // Word de vos (met wachtwoord)
    socket.on('becomeVos', (data) => {
        console.log('🦊 Vos aanvraag:', data);
        
        if (currentVos) {
            socket.emit('error', 'Er is al een vos! Er kan maar één vos zijn.');
            return;
        }
        
        if (data.password !== VOS_PASSWORD) {
            socket.emit('error', 'Ongeldig wachtwoord!');
            return;
        }
        
        // Maak deze speler de vos
        currentVos = {
            id: data.trackerId,
            name: data.name,
            socketId: socket.id
        };
        
        console.log('🦊 Nieuwe vos aangesteld:', currentVos.name);
        
        // Broadcast naar iedereen dat er een nieuwe vos is
        io.emit('vosStatus', { 
            hasVos: true, 
            vosName: currentVos.name,
            message: `🦊 ${currentVos.name} is nu de vos!`
        });
        
        socket.emit('vosSuccess', { message: 'Je bent nu de vos! Ren maar hard!' });
    });
    
    // Update location from tracker
    socket.on('updateLocation', (data) => {
        const isVos = currentVos && currentVos.id === data.trackerId;
        
        const trackerData = {
            ...data,
            id: data.trackerId,
            timestamp: new Date(),
            socketId: socket.id,
            isVos: isVos  // Voeg isVos property toe
        };
        
        activeTrackers.set(trackerData.id, trackerData);
        
        // Broadcast naar ALLE clients
        io.emit('locationUpdate', trackerData);
        
        console.log('📍 Location updated:', trackerData.id, isVos ? '(VOS)' : '(Zoeker)');
    });
    
    // Stop being vos
    socket.on('stopVos', () => {
        if (currentVos && currentVos.socketId === socket.id) {
            console.log('🦊 Vos gestopt:', currentVos.name);
            
            // Verwijder vos status
            const oldVosName = currentVos.name;
            currentVos = null;
            
            // Broadcast naar iedereen dat de vos weg is
            io.emit('vosStatus', { 
                hasVos: false, 
                message: `De vos (${oldVosName}) is ontsnapt!`
            });
        }
    });
    
    // Handle location requests
    socket.on('requestLocation', (trackerId) => {
        const location = activeTrackers.get(trackerId);
        if (location) {
            socket.emit('locationUpdate', location);
        }
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        // Als de vos disconnect, verwijder de vos
        if (currentVos && currentVos.socketId === socket.id) {
            console.log('🦊 Vos disconnected:', currentVos.name);
            const oldVosName = currentVos.name;
            currentVos = null;
            
            io.emit('vosStatus', { 
                hasVos: false, 
                message: `De vos (${oldVosName}) is ontsnapt!`
            });
        }
        
        // Clean up inactive trackers
        setTimeout(() => {
            for (const [trackerId, tracker] of activeTrackers) {
                if (tracker.socketId === socket.id) {
                    activeTrackers.delete(trackerId);
                    console.log('Cleaned up tracker:', trackerId);
                }
            }
        }, 300000);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Vossenjacht server running on port ${PORT}`);
    console.log(`🦊 Vos: http://localhost:${PORT}/tracker`);
    console.log(`👤 Zoekers: http://localhost:${PORT}/zoeker`);
    console.log(`👀 Viewer: http://localhost:${PORT}`);
});
