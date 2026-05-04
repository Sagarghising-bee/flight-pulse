const express = require('express');
const cors = require('cors');
const path = require('path');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// YOUR SERPAPI KEY
const SERPAPI_KEY = 'c017ced4ba739491ba8c0d57bd70625f3cd6188eb7db282e742c2a690031dc35';

// ========== PROXY ENDPOINT FOR SERPAPI ==========
app.get('/api/search-flights', async (req, res) => {
    const { from, to, departDate, returnDate, adults, children, cabinClass, tripType } = req.query;
    
    console.log(`📡 Flight search: ${from} → ${to}, ${departDate}`);
    
    if (!from || !to || !departDate) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Map cabin class to SerpApi travel_class
    const classMap = {
        'ECONOMY': '1',
        'PREMIUM_ECONOMY': '2', 
        'BUSINESS': '3',
        'FIRST': '4'
    };
    
    // Build SerpApi URL
    let apiUrl = `https://serpapi.com/search.json?engine=google_flights&departure_id=${from}&arrival_id=${to}&outbound_date=${departDate}&currency=USD&hl=en&gl=us&adults=${adults}&travel_class=${classMap[cabinClass] || '1'}&api_key=${SERPAPI_KEY}`;
    
    if (children && parseInt(children) > 0) {
        apiUrl += `&children=${children}`;
    }
    
    if (tripType === 'roundtrip' && returnDate) {
        apiUrl += `&return_date=${returnDate}`;
    }
    
    apiUrl += `&deep_search=true`;
    
    console.log("Calling SerpApi...");
    
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (data.error) {
            console.error("SerpApi error:", data.error);
            return res.status(400).json({ error: data.error });
        }
        
        // Extract and format flights
        let flights = [];
        if (data.best_flights && data.best_flights.length > 0) {
            flights = data.best_flights;
        }
        if (data.other_flights && data.other_flights.length > 0) {
            flights = flights.concat(data.other_flights);
        }
        
        // Sort by price
        flights.sort((a, b) => (a.price || a.total_price || 0) - (b.price || b.total_price || 0));
        
        res.json({
            success: true,
            flights: flights,
            googleFlightsUrl: data.search_metadata?.google_flights_url,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error("Proxy error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'alive', timestamp: new Date().toISOString() });
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ FlightPulse running on port ${PORT}`);
    console.log(`🔌 API: /api/search-flights?from=KTM&to=DXB&departDate=2026-05-14`);
});
