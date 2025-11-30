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

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'viewer.html'));
});

app.get('/tracker', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'tracker.html'));
});

// FIXED: Health endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        activeTrackers: activeTrackers.size,
        timestamp: new Date().toISOString(),
        message: 'Server is healthy!'
    });
});

// Socket.io for real-time communication
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // Join a specific tracker room
    socket.on('joinTracker', (trackerId) => {
        socket.join(trackerId);
        const location = activeTrackers.get(trackerId);
        if (location) {
            socket.emit('locationUpdate', location);
        }
    });
    
    // Update location from tracker
    socket.on('updateLocation', (data) => {
        const trackerData = {
            ...data,
            id: data.trackerId || 'default',
            timestamp: new Date(),
            socketId: socket.id
        };
        
        activeTrackers.set(trackerData.id, trackerData);
        
        // Broadcast to all viewers of this tracker
        io.to(trackerData.id).emit('locationUpdate', trackerData);
        
        console.log('Location updated:', trackerData.id);
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Render gebruikt process.env.PORT
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`👀 Viewer: https://your-app.onrender.com`);
    console.log(`📍 Tracker: https://your-app.onrender.com/tracker`);
    console.log(`❤️ Health: https://your-app.onrender.com/health`);
});
