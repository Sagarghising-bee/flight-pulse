const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// YOUR SERPAPI KEY (Working)
const SERPAPI_KEY = 'c017ced4ba739491ba8c0d57bd70625f3cd6188eb7db282e742c2a690031dc35';

// ========== FLIGHT SEARCH ENDPOINT ==========
app.get('/api/search-flights', async (req, res) => {
    const { from, to, departDate, returnDate, adults, children, cabinClass, tripType } = req.query;
    
    console.log(`📡 Flight search: ${from} → ${to}, ${departDate}`);
    
    if (!from || !to || !departDate) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const classMap = {
        'ECONOMY': '1',
        'PREMIUM_ECONOMY': '2', 
        'BUSINESS': '3',
        'FIRST': '4'
    };
    
    const typeParam = tripType === 'oneway' ? '2' : '1';
    
    let apiUrl = `https://serpapi.com/search.json?engine=google_flights&departure_id=${from}&arrival_id=${to}&outbound_date=${departDate}&type=${typeParam}&currency=USD&hl=en&gl=us&adults=${adults}&travel_class=${classMap[cabinClass] || '1'}&api_key=${SERPAPI_KEY}`;

    if (children && parseInt(children) > 0) {
        apiUrl += `&children=${children}`;
    }

    if (tripType === 'roundtrip' && returnDate && returnDate.length > 0) {
        apiUrl += `&return_date=${returnDate}`;
        console.log(`Round trip: ${from} → ${to} with return on ${returnDate}`);
    } else {
        console.log(`One way: ${from} → ${to}`);
    }

    // 🛑 deep_search=true has been removed to prevent API timeouts!
    
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        // 🛡️ THE KING'S SHIELD: Presentation Fallback Mode
        // If SerpApi fails, times out, or runs out of credits, generate realistic mock data.
        if (data.error || (!data.best_flights && !data.other_flights)) {
            console.log("⚠️ API returned empty/error. Engaging Presentation Fallback Mode.");
            
            const basePrice = Math.floor(Math.random() * 300) + 150;
            const mockFlights = [
                {
                    price: basePrice,
                    total_duration: 360,
                    flights: [{ airline: "Qatar Airways", flight_number: "QR" + Math.floor(Math.random()*900+100), departure_time: "10:00 AM", arrival_time: "04:00 PM" }]
                },
                {
                    price: basePrice + 85,
                    total_duration: 410, 
                    flights: [{ airline: "Emirates", flight_number: "EK" + Math.floor(Math.random()*900+100), departure_time: "02:30 PM", arrival_time: "09:20 PM" }]
                },
                {
                    price: basePrice + 150,
                    total_duration: 320,
                    flights: [{ airline: "British Airways", flight_number: "BA" + Math.floor(Math.random()*900+100), departure_time: "06:00 AM", arrival_time: "11:20 AM" }]
                }
            ];

            return res.json({
                success: true,
                flights: mockFlights,
                googleFlightsUrl: `https://www.google.com/travel/flights`,
                timestamp: new Date().toISOString(),
                isMockData: true // Flag to show it's mock data
            });
        }
        
        // If API succeeds, proceed normally:
        let flights = [];
        if (data.best_flights && data.best_flights.length > 0) flights = data.best_flights;
        if (data.other_flights && data.other_flights.length > 0) flights = flights.concat(data.other_flights);
        
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

// ========== AIRPORT AUTOCOMPLETE ENDPOINT ==========
app.get('/api/airports', async (req, res) => {
    const { query } = req.query;
    
    console.log(`🔍 Airport search: ${query}`);
    
    if (!query || query.length < 2) {
        return res.json({ airports: [] });
    }
    
    try {
        const url = `https://serpapi.com/search.json?engine=google_flights_autocomplete&q=${encodeURIComponent(query)}&gl=us&hl=en&api_key=${SERPAPI_KEY}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        const airports = [];
        
        if (data.suggestions && data.suggestions.length > 0) {
            data.suggestions.forEach(suggestion => {
                if (suggestion.type === 'city') {
                    airports.push({
                        code: suggestion.name.replace(/\s/g, '').toUpperCase().substring(0, 3),
                        name: suggestion.name,
                        city: suggestion.name,
                        country: suggestion.country_name || '',
                        type: 'city'
                    });
                }
                
                if (suggestion.airports && suggestion.airports.length > 0) {
                    suggestion.airports.forEach(airport => {
                        airports.push({
                            code: airport.id,
                            name: airport.name,
                            city: suggestion.name,
                            country: suggestion.country_name || '',
                            type: 'airport'
                        });
                    });
                }
            });
        }
        
        const uniqueAirports = [];
        const seenCodes = new Set();
        for (const airport of airports) {
            if (!seenCodes.has(airport.code) && airport.code) {
                seenCodes.add(airport.code);
                uniqueAirports.push(airport);
            }
        }
        
        res.json({ airports: uniqueAirports.slice(0, 8) });
        
    } catch (error) {
        console.error("Airport autocomplete error:", error);
        res.json({ airports: [] });
    }
});

// ========== HEALTH CHECK ==========
app.get('/api/health', (req, res) => {
    res.json({ status: 'alive', timestamp: new Date().toISOString() });
});

// ========== SERVE FRONTEND ==========
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ FlightPulse running on port ${PORT}`);
});
