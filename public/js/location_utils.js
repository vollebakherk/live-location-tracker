// location-utils.js - GPS precisie en afstandsberekeningen
const LocationUtils = {
    PRECISION: 7, // 7 decimalen = ~1cm precisie
    TOGETHER_THRESHOLD: 3, // 3 meter = "samen staan"
    
    // Formatteer positie naar hoge precisie
    formatPosition: function(lat, lng) {
        return {
            lat: parseFloat(Number(lat).toFixed(this.PRECISION)),
            lng: parseFloat(Number(lng).toFixed(this.PRECISION))
        };
    },
    
    // Gebruik dezelfde functie als map-utils.js voor consistentie
    calculateDistance: function(lat1, lng1, lat2, lng2) {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lng2 - lng1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        console.log(`📏 Afstand berekend: ${distance.toFixed(2)}m`);
        return distance;
    },
    
    // Check of spelers bij elkaar staan
    arePlayersTogether: function(pos1, pos2) {
        if (!pos1 || !pos2) return false;
        
        const distance = this.calculateDistance(
            pos1.lat, pos1.lng,
            pos2.lat, pos2.lng
        );
        
        const isTogether = distance <= this.TOGETHER_THRESHOLD;
        if (isTogether) {
            console.log(`🎯 Spelers staan bij elkaar! Afstand: ${distance.toFixed(1)}m`);
        }
        
        return isTogether;
    },
    
    // GPS opties voor betere nauwkeurigheid
    getGPSOptions: function() {
        return {
            enableHighAccuracy: true, // CRUCIAAL voor precisie
            maximumAge: 0,           // Geen oude data
            timeout: 10000
        };
    },
    
    // Filter onnauwkeurige posities
    isValidPosition: function(coords) {
        if (!coords) return false;
        
        // Als accuracy te groot is, negeren we de positie
        if (coords.accuracy && coords.accuracy > 20) {
            console.warn(`GPS te onnauwkeurig: ${coords.accuracy.toFixed(1)}m`);
            return false;
        }
        
        return true;
    }
};
