// location-utils.js - Locatie verwerking en GPS utils
const LocationUtils = {
    PRECISION: 6,
    TOGETHER_THRESHOLD: 5, // meter
    MAX_ACCURACY: 25, // meter
    
    formatPosition: function(position) {
        let lat, lng;
        
        if (Array.isArray(position)) {
            lat = position[0];
            lng = position[1];
        } else if (position.lat !== undefined && position.lng !== undefined) {
            lat = position.lat;
            lng = position.lng;
        } else if (position.lat !== undefined && position.lon !== undefined) {
            lat = position.lat;
            lng = position.lon;
        } else {
            console.error('Ongeldig positie formaat:', position);
            return null;
        }
        
        return {
            lat: parseFloat(Number(lat).toFixed(this.PRECISION)),
            lng: parseFloat(Number(lng).toFixed(this.PRECISION))
        };
    },
    
    calculateDistance: function(pos1, pos2) {
        if (!pos1 || !pos2) return Infinity;
        
        const p1 = this.formatPosition(pos1);
        const p2 = this.formatPosition(pos2);
        
        const R = 6371000; // Aardstraal in meters
        const toRad = (value) => (value * Math.PI) / 180;
        
        const φ1 = toRad(p1.lat);
        const φ2 = toRad(p2.lat);
        const Δφ = toRad(p2.lat - p1.lat);
        const Δλ = toRad(p2.lng - p1.lng);
        
        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        
        const distance = R * c;
        console.log(`📏 Afstand tussen spelers: ${distance.toFixed(1)}m`);
        return distance;
    },
    
    arePlayersTogether: function(pos1, pos2, threshold = this.TOGETHER_THRESHOLD) {
        const distance = this.calculateDistance(pos1, pos2);
        return distance <= threshold;
    },
    
    getGPSOptions: function() {
        return {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 10000
        };
    },
    
    isValidPosition: function(coords) {
        if (!coords) return false;
        if (coords.accuracy && coords.accuracy > this.MAX_ACCURACY) {
            console.warn(`Positie te onnauwkeurig: ${coords.accuracy.toFixed(1)}m`);
            return false;
        }
        return true;
    }
};

// Export voor gebruik
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LocationUtils;
}
