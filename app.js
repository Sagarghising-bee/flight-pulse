// ========== 1. SERVICE WORKER ==========
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(() => console.log("✅ FlightPulse: Service Worker Active"))
        .catch(err => console.log("SW Error:", err));
}

// ========== 2. AIRPORT INTEL DATABASE ==========
const airportIntel = {
    "LHR": { tip: "Very busy. Allow 3 hours for connections.", bestLounge: "Cathay Pacific Lounge", wifi: "Free 60min" },
    "BKK": { tip: "Busy but organized. Great food courts.", bestLounge: "Miracle Lounge", wifi: "Free 2 hours" },
    "DXB": { tip: "Ultra-busy. Security ~25min. Zen Garden near Gate B7.", bestLounge: "Emirates Lounge B Gates", wifi: "DXB Free WiFi" },
    "KTM": { tip: "Moderate crowds. Fast security. Try Himalayan Java for views.", bestLounge: "Civil Aviation Lounge", wifi: "Free 30min" },
    "SIN": { tip: "Very efficient. Jewel Waterfall is a must if 4+ hours.", bestLounge: "SilverKris Lounge", wifi: "Unlimited Free" },
    "JFK": { tip: "Arrive 3 hours early. TSA PreCheck recommended.", bestLounge: "Delta Sky Club T4", wifi: "Free" },
    "LAX": { tip: "Very busy. Allow plenty of time for security.", bestLounge: "Star Alliance Lounge", wifi: "Free" },
    "CDG": { tip: "Busy, allow 3hr connection. Terminal 2E has great shopping.", bestLounge: "Air France Lounge", wifi: "Free 30min" },
    "FRA": { tip: "Efficient but large. Allow 2hr minimum.", bestLounge: "Lufthansa Senator Lounge", wifi: "Free 60min" },
    "IST": { tip: "Huge airport! Allow 3hr+ for connections.", bestLounge: "Turkish Airlines Lounge", wifi: "Unlimited Free" }
};

// ========== 3. TRIP TYPE STATE ==========
let currentTripType = 'oneway';

function setTripType(type) {
    console.log(`🔄 Setting trip type to: ${type}`);
    currentTripType = type;
    const oneWayBtn = document.getElementById('oneWayBtn');
    const roundTripBtn = document.getElementById('roundTripBtn');
    const returnRow = document.getElementById('returnDateRow');
    
    if (type === 'oneway') {
        oneWayBtn.classList.remove('bg-gray-100', 'text-gray-600');
        oneWayBtn.classList.add('bg-blue-600', 'text-white');
        roundTripBtn.classList.remove('bg-blue-600', 'text-white');
        roundTripBtn.classList.add('bg-gray-100', 'text-gray-600');
        if (returnRow) returnRow.classList.add('hidden');
        if (document.getElementById('returnDate')) {
            document.getElementById('returnDate').value = '';
        }
    } else {
        roundTripBtn.classList.remove('bg-gray-100', 'text-gray-600');
        roundTripBtn.classList.add('bg-blue-600', 'text-white');
        oneWayBtn.classList.remove('bg-blue-600', 'text-white');
        oneWayBtn.classList.add('bg-gray-100', 'text-gray-600');
        if (returnRow) returnRow.classList.remove('hidden');
        const departDate = document.getElementById('departDate').value;
        if (departDate && !document.getElementById('returnDate').value) {
            const returnDateObj = new Date(departDate);
            returnDateObj.setDate(returnDateObj.getDate() + 7);
            document.getElementById('returnDate').value = returnDateObj.toISOString().split('T')[0];
        }
    }
}

// ========== 4. TAB SWITCHING ==========
function switchTab(viewId, btn) {
    const views = ['view-search', 'view-tracker', 'view-layovers'];
    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    const activeView = document.getElementById(viewId);
    if (activeView) activeView.classList.remove('hidden');
    
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(b => {
        b.classList.remove('text-blue-600');
        b.classList.add('text-gray-400');
    });
    if (btn) {
        btn.classList.remove('text-gray-400');
        btn.classList.add('text-blue-600');
    }
}

// ========== 5. MAIN SEARCH FUNCTION ==========
async function searchFlight() {
    const from = document.getElementById('fromInput').value.trim().toUpperCase();
    const to = document.getElementById('destInput').value.trim().toUpperCase();
    const departDate = document.getElementById('departDate').value;
    const returnDate = document.getElementById('returnDate')?.value;
    const adults = document.getElementById('adultsCount')?.value || 1;
    const children = document.getElementById('childrenCount')?.value || 0;
    const cabinClass = document.getElementById('cabinClass')?.value || 'ECONOMY';
    
    if (!from || !to) {
        alert("Please enter both airports ✈️");
        return;
    }
    
    if (!departDate) {
        alert("Please select a departure date 📅");
        return;
    }

    localStorage.setItem('lastSearchFrom', from);
    localStorage.setItem('lastSearchTo', to);
    localStorage.setItem('lastDepartDate', departDate);

    const trending = document.getElementById('trendingSection');
    if (trending) trending.style.display = 'none';

    const airport = airportIntel[to];
    const infoBox = document.getElementById('layoverInfo');
    const infoText = document.getElementById('infoText');
    if (airport && infoText) {
        infoText.innerHTML = `
            <div class="space-y-1">
                <p>📍 <strong>${to}</strong>: ${airport.tip}</p>
                <p>🛋️ Lounge: ${airport.bestLounge}</p>
                <p>📶 WiFi: ${airport.wifi}</p>
            </div>
        `;
        infoBox.classList.remove('hidden');
    }
    
    const container = document.getElementById('flightResults');
    container.innerHTML = `
        <div class="text-center py-12">
            <div class="loader mx-auto"></div>
            <p class="mt-4 text-gray-500 font-medium">Searching real flight prices...</p>
            <p class="text-xs text-gray-400 mt-2">${from} → ${to} • ${departDate} • ${adults} adult${adults > 1 ? 's' : ''}</p>
        </div>
    `;
    
    try {
        let apiUrl = `/api/search-flights?from=${from}&to=${to}&departDate=${departDate}&adults=${adults}&children=${children}&cabinClass=${cabinClass}&tripType=${currentTripType}`;
        
        if (currentTripType === 'roundtrip' && returnDate && returnDate.length > 0) {
            apiUrl += `&returnDate=${returnDate}`;
        }
        
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || `HTTP ${response.status}`);
        }
        
        if (data.success && data.flights && data.flights.length > 0) {
            renderFlightResults(data.flights, from, to, data.googleFlightsUrl);
        } else {
            container.innerHTML = `
                <div class="bg-yellow-50 rounded-2xl p-8 text-center border border-yellow-200">
                    <p class="text-yellow-700 font-medium">⚠️ No flights found for ${from} → ${to}</p>
                    <p class="text-sm text-yellow-600 mt-2">Try different dates or airports</p>
                    <button onclick="searchFlight()" class="mt-4 bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm">Retry</button>
                </div>
            `;
        }
        
    } catch (error) {
        console.error("Search error:", error);
        container.innerHTML = `
            <div class="bg-red-50 rounded-2xl p-8 text-center border border-red-200">
                <p class="text-red-600 font-medium">🔴 Unable to fetch flight prices</p>
                <p class="text-sm text-red-500 mt-2">${error.message}</p>
                <button onclick="searchFlight()" class="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg text-sm">Retry</button>
            </div>
        `;
    }
}

// ========== 6. PROPRIETARY ECO-CALCULATOR ==========
function getCarbonFootprint(durationMins, stops) {
    if (!durationMins) {
        return { text: "CO₂ Unknown", classes: "bg-gray-100 text-gray-600 border-gray-200" };
    }
    
    // ~1.5 kg of CO2 per minute + 50kg penalty per layover
    let baseCO2 = durationMins * 1.5;
    let layoverPenalty = stops * 50; 
    let totalCO2 = Math.round(baseCO2 + layoverPenalty);

    if (stops === 0 && totalCO2 < 500) {
        return { text: `🌱 ${totalCO2}kg CO₂ • Eco-Friendly`, classes: "bg-green-50 text-green-700 border-green-200" };
    } else if (stops >= 2 || totalCO2 > 1000) {
        return { text: `⚠️ ${totalCO2}kg CO₂ • High Impact`, classes: "bg-red-50 text-red-700 border-red-200" };
    } else {
        return { text: `☁️ ${totalCO2}kg CO₂ • Standard`, classes: "bg-slate-50 text-slate-600 border-slate-200" };
    }
}

// ========== 7. RENDER FLIGHT RESULTS (UPGRADED WITH LUGGAGE) ==========
function renderFlightResults(flights, from, to, googleFlightsUrl) {
    const container = document.getElementById('flightResults');
    container.innerHTML = '';
    
    const header = document.createElement('div');
    header.className = 'text-right text-[10px] text-gray-400 mb-2';
    header.innerHTML = `🟢 Live Search • ${flights.length} options found • Sorted by price`;
    container.appendChild(header);
    
    flights.forEach((flight, idx) => {
        const isCheapest = idx === 0;
        const firstLeg = flight.flights ? flight.flights[0] : flight;
        const lastLeg = flight.flights ? flight.flights[flight.flights.length - 1] : flight;
        
        const airline = firstLeg.airline || "Airline";
        const flightNumber = firstLeg.flight_number || "";
        const depTime = firstLeg.departure_airport?.time?.split(' ')[1] || firstLeg.departure_time || "00:00";
        const arrTime = lastLeg.arrival_airport?.time?.split(' ')[1] || lastLeg.arrival_time || "00:00";
        const duration = flight.total_duration ? `${Math.floor(flight.total_duration / 60)}h ${flight.total_duration % 60}m` : "N/A";
        const stops = flight.flights ? flight.flights.length - 1 : 0;
        const price = flight.price || flight.total_price || 0;
        
        let bookingUrl = googleFlightsUrl || `https://www.google.com/travel/flights?q=flights+from+${from}+to+${to}`;
        
        // Call the Eco Calculator directly from inside this file
        const ecoData = getCarbonFootprint(flight.total_duration, stops);
        
                // 👑 NEW: Smart Luggage Scanner with KGs
        let luggageInfo = "🧳 7kg Cabin Bag"; // International standard fallback
        if (flight.extensions && flight.extensions.length > 0) {
            const bagInfo = flight.extensions.find(ext => ext.toLowerCase().includes('bag'));
            if (bagInfo) {
                // Intercept Google's generic text and add specific weights
                if (bagInfo.toLowerCase().includes('carry-on')) {
                    luggageInfo = "🧳 7kg Carry-on Included";
                } else if (bagInfo.toLowerCase().includes('no overhead')) {
                    luggageInfo = "🎒 Personal Item Only (Under Seat)";
                } else if (bagInfo.toLowerCase().includes('checked')) {
                    luggageInfo = "🧳 23kg Checked Bag Included";
                } else {
                    luggageInfo = "🧳 " + bagInfo;
                }
            }
        }

        
        const card = document.createElement('div');
        card.className = `bg-white rounded-2xl shadow-sm border ${isCheapest ? 'border-green-300 ring-2 ring-green-200' : 'border-gray-100'} p-5 mb-4 fade-in hover:shadow-md transition-all`;
        card.style.animationDelay = `${idx * 0.05}s`;
        
        card.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-xs font-bold bg-blue-50 text-blue-700 px-3 py-1 rounded-lg">${airline}</span>
                    ${flightNumber ? `<span class="text-[10px] text-gray-400">${flightNumber}</span>` : ''}
                    ${isCheapest ? '<span class="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-lg">🏆 CHEAPEST</span>' : ''}
                    <span class="text-[10px] font-bold px-2 py-1 rounded-lg border ${ecoData.classes}">${ecoData.text}</span>
                    
                    <span class="text-[10px] font-bold px-2 py-1 rounded-lg border bg-purple-50 text-purple-700 border-purple-200">${luggageInfo}</span>
                </div>
                <div class="text-right ml-2 shrink-0">
                    <span class="text-2xl font-bold text-gray-900">$${price}</span>
                    <span class="text-[10px] text-gray-400 block">${stops === 0 ? 'Direct' : stops + ' stop' + (stops > 1 ? 's' : '')}</span>
                </div>
            </div>
            
            <div class="flex justify-between items-center mb-4 mt-4">
                <div class="text-center">
                    <p class="text-xl font-bold text-gray-800">${depTime}</p>
                    <p class="text-gray-400 text-[10px] font-bold">${from}</p>
                </div>
                <div class="flex-1 px-3 text-center">
                    <div class="text-gray-400 text-xs">✈️ ${duration}</div>
                    <div class="w-full h-px bg-gray-200 my-1"></div>
                </div>
                <div class="text-center">
                    <p class="text-xl font-bold text-gray-800">${arrTime}</p>
                    <p class="text-gray-400 text-[10px] font-bold">${to}</p>
                </div>
            </div>
            
            <button onclick="window.open('${bookingUrl}', '_blank')" 
                    class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition text-sm flex items-center justify-center gap-2">
                ✈️ Book on Google Flights — $${price}
            </button>
        `;
        container.appendChild(card);
    });
}



// ========== 8. FILL SEARCH FROM TRENDING ==========
function fillSearch(from, to) {
    document.getElementById('fromInput').value = from;
    document.getElementById('destInput').value = to;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 30);
    document.getElementById('departDate').value = tomorrow.toISOString().split('T')[0];
    if (currentTripType !== 'oneway') {
        setTripType('oneway');
    }
    searchFlight();
}

// ========== 9. LIVE TRACKER ==========
async function trackFlight(btn) {
    const flightNo = document.getElementById('flightNoInput').value.trim().toUpperCase();
    if (!flightNo) {
        alert("Enter flight number (e.g., QR645, BA117)");
        return;
    }

    const originalText = btn.innerText;
    btn.innerText = "🛰️ Opening tracker...";
    btn.disabled = true;

    window.open(`https://flightaware.com/live/flight/${flightNo}`, '_blank');
    
    const resultDiv = document.getElementById('trackerResult');
    resultDiv.innerHTML = `
        <div class="bg-green-50 border border-green-200 rounded-2xl p-4 text-left fade-in mt-4">
            <div class="flex items-center gap-2">
                <div class="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span class="font-bold text-green-700 text-sm">Tracking ${flightNo}</span>
            </div>
            <p class="text-sm text-gray-600 mt-2">✅ FlightAware opened with real-time position, maps, and status.</p>
        </div>
    `;
    
    btn.innerText = originalText;
    btn.disabled = false;
}

// ========== 10. LAYOVER INTEL ==========
async function getLayoverIntel(btn) {
    const airport = document.getElementById('airportInput').value.trim().toUpperCase();
    if (!airport) {
        alert("Please enter an airport code (e.g., DXB, LHR, BKK)");
        return;
    }
    
    const originalText = btn.innerText;
    btn.innerText = "🔍 Scanning...";
    
    await new Promise(r => setTimeout(r, 500));
    
    const intel = airportIntel[airport] || {
        tip: `Standard transit at ${airport}. Allow 2-3 hours for international connections.`,
        bestLounge: "Check with your airline for lounge access",
        wifi: "Free WiFi usually available"
    };
    
    document.getElementById('layoverResult').innerHTML = `
        <div class="bg-orange-50 border border-orange-200 rounded-2xl p-5 text-left fade-in mt-4">
            <h3 class="font-bold text-orange-800 text-lg mb-3">📍 ${airport} Airport Intel</h3>
            <div class="space-y-2 text-sm">
                <p class="text-orange-700">💡 ${intel.tip}</p>
                <p class="text-orange-700">🛋️ Lounge: ${intel.bestLounge}</p>
                <p class="text-orange-700">📶 WiFi: ${intel.wifi}</p>
            </div>
            <div class="flex gap-2 mt-4">
                <button onclick="window.open('https://www.google.com/search?q=${airport}+airport+guide', '_blank')" 
                        class="flex-1 bg-orange-100 text-orange-700 font-bold py-2 rounded-xl text-sm hover:bg-orange-200 transition">
                    🔍 Full Guide
                </button>
                <button onclick="window.open('https://www.flightradar24.com/airport/${airport}', '_blank')" 
                        class="flex-1 bg-blue-100 text-blue-700 font-bold py-2 rounded-xl text-sm hover:bg-blue-200 transition">
                    📡 Live Traffic
                </button>
            </div>
        </div>
    `;
    
    btn.innerText = originalText;
}

// ========== 11. AIRPORT AUTOCOMPLETE ==========
let searchTimeout;

function setupAirportSearch(inputId, suggestionsId) {
    const input = document.getElementById(inputId);
    const suggestionsDiv = document.getElementById(suggestionsId);
    
    if (!input) return;
    
    input.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        const query = this.value.trim();
        
        if (query.length < 2) {
            suggestionsDiv.classList.add('hidden');
            return;
        }
        
        suggestionsDiv.innerHTML = '<div class="suggestion-item text-gray-400">✈️ Searching airports...</div>';
        suggestionsDiv.classList.remove('hidden');
        
        searchTimeout = setTimeout(async () => {
            try {
                const response = await fetch(`/api/airports?query=${encodeURIComponent(query)}`);
                const data = await response.json();
                
                if (data.airports && data.airports.length > 0) {
                    suggestionsDiv.innerHTML = data.airports.map(airport => `
                        <div class="suggestion-item" onclick="selectAirport('${inputId}', '${airport.code}', '${airport.name}', '${airport.city}')">
                            <div class="flex justify-between items-center">
                                <div>
                                    <span class="font-bold text-gray-800">${airport.code}</span>
                                    <span class="text-sm text-gray-600 ml-2">${airport.name}</span>
                                </div>
                                <span class="text-xs text-blue-600">${airport.city}</span>
                            </div>
                            ${airport.country ? `<div class="text-xs text-gray-400 mt-1">${airport.country}</div>` : ''}
                        </div>
                    `).join('');
                } else {
                    suggestionsDiv.innerHTML = '<div class="suggestion-item text-gray-400">📍 No airports found. Try typing airport code (e.g., LHR)</div>';
                }
            } catch (error) {
                console.error("Airport search error:", error);
                suggestionsDiv.innerHTML = '<div class="suggestion-item text-red-500">⚠️ Unable to load suggestions</div>';
            }
        }, 300);
    });
}

function selectAirport(inputId, code, name, city) {
    const input = document.getElementById(inputId);
    input.value = code;
    const suggestionsId = inputId === 'fromInput' ? 'fromSuggestions' : 'destSuggestions';
    document.getElementById(suggestionsId).classList.add('hidden');
}

// ========== 12. INITIALIZATION ==========
window.addEventListener('load', () => {
    console.log("🚀 FlightPulse initializing...");
    
    const savedFrom = localStorage.getItem('lastSearchFrom');
    const savedTo = localStorage.getItem('lastSearchTo');
    const savedDate = localStorage.getItem('lastDepartDate');
    
    if (savedFrom) document.getElementById('fromInput').value = savedFrom;
    if (savedTo) document.getElementById('destInput').value = savedTo;
    if (savedDate) document.getElementById('departDate').value = savedDate;
    
    if (!savedDate) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        document.getElementById('departDate').value = tomorrow.toISOString().split('T')[0];
    }
    
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    const greetingEl = document.getElementById('greetingMsg');
    if (greetingEl) greetingEl.innerHTML = `${greeting}, Captain ✈️`;
    
    setupAirportSearch('fromInput', 'fromSuggestions');
    setupAirportSearch('destInput', 'destSuggestions');
    
    fetch('/api/health')
        .then(res => res.json())
        .then(data => console.log("✅ API connected:", data))
        .catch(err => console.error("❌ API connection failed:", err));
    
    console.log("✅ FlightPulse ready!");
});
