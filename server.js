const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// YOUR SERPAPI KEY (Working)
const SERPAPI_KEY = '934a7325f0321ca677d0b4915b49ebf284836a171f2fd5a454e4f21417f5ff76';

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

    //  deep_search=true has been removed to prevent API timeouts!
    
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        // 🛡️ THE KING'S SHIELD: Presentation Fallback Mode
        // If SerpApi fails, times out, or runs out of credits, generate realistic mock data.
        if (data.error || (!data.best_flights && !data.other_flights)) {
const express = require('express');
const cors = require('cors');
const path = require('path');
const { ApifyClient } = require('apify-client');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ========== APIFY CONFIGURATION ==========
const APIFY_TOKEN = 'apify_api_ffkcxtDoyPJnG5f4ycdm2ctZGJkkOM44WBx3';
const apifyClient = new ApifyClient({ token: APIFY_TOKEN });

// ========== FLIGHT SEARCH ENDPOINT ==========
app.get('/api/search-flights', async (req, res) => {
    const { from, to, departDate, returnDate, adults, children, cabinClass, tripType } = req.query;
    
    console.log(`📡 Flight search: ${from} → ${to}, ${departDate}`);
    
    if (!from || !to || !departDate) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    try {
        console.log('🟢 Calling Apify Skyscanner API...');
        
        // Prepare Apify input
        const runInput = {
            endpoint: "flights/search",
            query: {
                origin: from,
                destination: to,
                departureDate: departDate,
                adults: parseInt(adults) || 1,
                currency: "USD",
                cabins: [cabinClass?.toLowerCase() || "economy"]
            },
            maxTotalChargeUsd: 0.05
        };
        
        // Add return date for round trips
        if (tripType === 'roundtrip' && returnDate && returnDate.length > 0) {
            runInput.query.returnDate = returnDate;
        }
        
        console.log('🚀 Starting Apify actor...');
        
        // Run the actor
        const run = await apifyClient.actor("elis/skyscanner-api").call({ run_input: runInput });
        
        // Fetch results
        const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
        
        console.log(`✅ Apify returned ${items.length} flights`);
        
        if (!items || items.length === 0) {
            return res.json({ 
                success: false, 
                flights: [], 
                message: "No flights found for this route" 
            });
        }
        
        // Transform to match your frontend format
        const flights = items.map(flight => ({
            price: flight.price || 999,
            total_price: flight.price || 999,
            flights: [{
                airline: flight.airline || flight.marketing_carrier || "Unknown",
                flight_number: flight.flight_number || "",
                departure_airport: {
                    code: from,
                    time: flight.departure_time || "08:00"
                },
                arrival_airport: {
                    code: to,
                    time: flight.arrival_time || "18:00"
                }
            }],
            total_duration: flight.duration || 120
        }));
        
        res.json({
            success: true,
            flights: flights,
            source: 'apify',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error("❌ Apify error:", error);
        res.status(500).json({ 
            error: error.message,
            suggestion: "Try different airports or dates"
        });
    }
});

// ========== AIRPORT AUTOCOMPLETE ==========
app.get('/api/airports', async (req, res) => {
    const { query } = req.query;
    
    if (!query || query.length < 2) {
        return res.json({ airports: [] });
    }
    
    // Simple airport database for demo
    const airports = {
        "JFK": { code: "JFK", name: "John F Kennedy", city: "New York", country: "USA" },
        "LHR": { code: "LHR", name: "Heathrow", city: "London", country: "UK" },
        "DXB": { code: "DXB", name: "Dubai International", city: "Dubai", country: "UAE" },
        "LAX": { code: "LAX", name: "Los Angeles", city: "Los Angeles", country: "USA" },
        "BKK": { code: "BKK", name: "Suvarnabhumi", city: "Bangkok", country: "Thailand" },
        "SIN": { code: "SIN", name: "Changi", city: "Singapore", country: "Singapore" },
        "CDG": { code: "CDG", name: "Charles de Gaulle", city: "Paris", country: "France" },
        "FRA": { code: "FRA", name: "Frankfurt", city: "Frankfurt", country: "Germany" },
        "IST": { code: "IST", name: "Istanbul", city: "Istanbul", country: "Turkey" },
        "KTM": { code: "KTM", name: "Tribhuvan", city: "Kathmandu", country: "Nepal" }
    };
    
    const matches = Object.values(airports).filter(a => 
        a.code.includes(query.toUpperCase()) || 
        a.city.toLowerCase().includes(query.toLowerCase())
    );
    
    res.json({ airports: matches.slice(0, 5) });
});

// ========== HEALTH CHECK ==========
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'alive', 
        source: 'apify-skyscanner',
        timestamp: new Date().toISOString() 
    });
});

// ========== SERVE FRONTEND ==========
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ FlightPulse running on port ${PORT}`);
    console.log(`🟢 Apify ready with token: ${APIFY_TOKEN.substring(0, 20)}...`);
});
