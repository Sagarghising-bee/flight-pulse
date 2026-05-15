const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ========== APIFY CONFIGURATION ==========
const APIFY_TOKEN = 'apify_api_ffkcxtDoyPJnG5f4ycdm2ctZGJkkOM44WBx3';

// ========== FLIGHT SEARCH ENDPOINT ==========
app.get('/api/search-flights', async (req, res) => {
    const { from, to, departDate, returnDate, adults, children, cabinClass, tripType } = req.query;
    
    console.log(`📡 Flight search: ${from} → ${to}, ${departDate}`);
    
    if (!from || !to || !departDate) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    try {
        console.log('🟢 Calling Apify Skyscanner API...');
        
        // Correct Apify API format using direct fetch
        const apifyResponse = await fetch('https://api.apify.com/v2/acts/elis~skyscanner-api/runs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${APIFY_TOKEN}`
            },
            body: JSON.stringify({
                runInput: {
                    endpoint: "flights/search",
                    query: {
                        origin: from,
                        destination: to,
                        departureDate: departDate,
                        adults: parseInt(adults) || 1,
                        currency: "USD"
                    },
                    maxTotalChargeUsd: 0.05
                }
            })
        });
        
        const runData = await apifyResponse.json();
        console.log('Apify run started:', runData.data?.defaultDatasetId);
        
        if (!runData.data || !runData.data.defaultDatasetId) {
            throw new Error('Failed to start Apify actor');
        }
        
        const datasetId = runData.data.defaultDatasetId;
        
        // Poll for results (wait up to 15 seconds)
        let flights = [];
        let attempts = 0;
        const maxAttempts = 8;
        
        while (attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, 2000));
            
            const datasetResponse = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`);
            const items = await datasetResponse.json();
            
            if (items && items.length > 0) {
                flights = items;
                break;
            }
            attempts++;
        }
        
        console.log(`✅ Apify returned ${flights.length} flights`);
        
        if (flights.length === 0) {
            // Return mock data for demo if Apify returns nothing
            const mockFlights = generateMockFlights(from, to);
            return res.json({
                success: true,
                flights: mockFlights,
                source: 'mock',
                timestamp: new Date().toISOString()
            });
        }
        
        // Transform Apify data to frontend format
        const transformedFlights = flights.map(flight => ({
            price: flight.price || 199,
            total_price: flight.price || 199,
            flights: [{
                airline: flight.airline || flight.marketing_carrier || flight.carrier || "Unknown Airline",
                flight_number: flight.flight_number || flight.flightNo || "",
                departure_airport: {
                    code: from,
                    time: flight.departure_time || flight.departureTime || "08:00"
                },
                arrival_airport: {
                    code: to,
                    time: flight.arrival_time || flight.arrivalTime || "18:00"
                }
            }],
            total_duration: flight.duration || 120
        }));
        
        res.json({
            success: true,
            flights: transformedFlights,
            source: 'apify',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error("❌ Apify error:", error.message);
        // Return mock data on error so UI still works
        const mockFlights = generateMockFlights(from, to);
        res.json({
            success: true,
            flights: mockFlights,
            source: 'mock',
            timestamp: new Date().toISOString()
        });
    }
});

// ========== GENERATE MOCK FLIGHTS (Fallback) ==========
function generateMockFlights(from, to) {
    const airlines = ['Delta', 'United', 'American', 'Emirates', 'Qatar', 'British Airways'];
    const times = ['06:00', '08:30', '11:15', '14:45', '17:20', '21:00'];
    
    const flights = [];
    for (let i = 0; i < 6; i++) {
        const price = Math.floor(Math.random() * (500 - 89 + 1) + 89);
        flights.push({
            price: price,
            total_price: price,
            flights: [{
                airline: airlines[Math.floor(Math.random() * airlines.length)],
                flight_number: `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 900) + 100}`,
                departure_airport: { code: from, time: times[i] },
                arrival_airport: { code: to, time: `${parseInt(times[i].split(':')[0]) + 3}:${times[i].split(':')[1]}` }
            }],
            total_duration: 180 + Math.floor(Math.random() * 120)
        });
    }
    return flights.sort((a, b) => a.price - b.price);
}

// ========== AIRPORT AUTOCOMPLETE ==========
app.get('/api/airports', async (req, res) => {
    const { query } = req.query;
    
    if (!query || query.length < 2) {
        return res.json({ airports: [] });
    }
    
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
        "KTM": { code: "KTM", name: "Tribhuvan", city: "Kathmandu", country: "Nepal" },
        "SYD": { code: "SYD", name: "Sydney Kingsford Smith", city: "Sydney", country: "Australia" },
        "MEL": { code: "MEL", name: "Melbourne", city: "Melbourne", country: "Australia" }
    };
    
    const matches = Object.values(airports).filter(a => 
        a.code.includes(query.toUpperCase()) || 
        a.city.toLowerCase().includes(query.toLowerCase()) ||
        a.name.toLowerCase().includes(query.toLowerCase())
    );
    
    res.json({ airports: matches.slice(0, 8) });
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

// ========== START SERVER ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ FlightPulse running on port ${PORT}`);
    console.log(`🟢 Mock flight data ready`);
});
