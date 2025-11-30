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
const VOS_PASSWORD = 'vos123'; // Wijzig dit wachtwoord!

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

// Socket.io
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // Stuur vos status
    socket.emit('vosStatus', { hasVos: !!currentVos, vosName: currentVos?.name });
    
    // Stuur actieve trackers
    activeTrackers.forEach((tracker) => {
        socket.emit('locationUpdate', tracker);
    });
    
    // Word de vos
    socket.on('becomeVos', (data) => {
        if (currentVos) {
            socket.emit('error', 'Er is al een vos! Er kan maar één vos zijn.');
            return;
        }
        
        if (data.password !== VOS_PASSWORD) {
            socket.emit('error', 'Ongeldig wachtwoord!');
            return;
        }
        
        currentVos = {
            id: data.trackerId,
            name: data.name,
            socketId: socket.id
        };
        
        console.log('🦊 Nieuwe vos:', currentVos.name);
        io.emit('vosStatus', { 
            hasVos: true, 
            vosName: currentVos.name,
            message: `🦊 ${currentVos.name} is nu de vos!`
        });
        
        socket.emit('vosSuccess', { message: 'Je bent nu de vos!' });
    });
    
    // Update location
    socket.on('updateLocation', (data) => {
        const trackerData = {
            ...data,
            id: data.trackerId,
            timestamp: new Date(),
            socketId: socket.id,
            isVos: currentVos && currentVos.id === data.trackerId
        };
        
        activeTrackers.set(trackerData.id, trackerData);
        io.emit('locationUpdate', trackerData);
    });
    
    // Stop vos
    socket.on('stopVos', () => {
        if (currentVos && currentVos.socketId === socket.id) {
            console.log('🦊 Vos gestopt:', currentVos.name);
            currentVos = null;
            io.emit('vosStatus', { 
                hasVos: false, 
                message: 'De vos is ontsnapt!'
            });
        }
    });
    
    // Disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        if (currentVos && currentVos.socketId === socket.id) {
            console.log('🦊 Vos disconnected');
            currentVos = null;
            io.emit('vosStatus', { hasVos: false });
        }
        
        // Cleanup
        setTimeout(() => {
            for (const [trackerId, tracker] of activeTrackers) {
                if (tracker.socketId === socket.id) {
                    activeTrackers.delete(trackerId);
                }
            }
        }, 300000);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Vossenjacht server running on port ${PORT}`);
});
