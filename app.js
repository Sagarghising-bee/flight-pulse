// ========== 1. SERVICE WORKER ==========
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(() => console.log("✅ FlightPulse: Service Worker Active"))
        .catch(err => console.log("SW Error:", err));
}

// ========== 2. YOUR BACKEND URL (Replace with your Render URL) ==========
const API_URL = '';

// ========== 3. AIRPORT INTEL ==========
const airportIntel = {
    "DXB": { tip: "Ultra-busy. Security ~25min. Zen Garden near Gate B7 is quiet.", bestLounge: "Emirates Lounge B Gates", wifi: "DXB Free WiFi" },
    "KTM": { tip: "Moderate crowds. Fast security. Try Himalayan Java for views.", bestLounge: "Civil Aviation Lounge", wifi: "Free 30min" },
    "SIN": { tip: "Very efficient. Jewel Waterfall is a must if 4+ hours.", bestLounge: "SilverKris Lounge", wifi: "Unlimited Free" },
    "LHR": { tip: "Very busy. Use Flight Connection Centre.", bestLounge: "Cathay Pacific Lounge", wifi: "Free 60min" },
    "JFK": { tip: "Arrive 3hr early. TSA PreCheck recommended.", bestLounge: "Delta Sky Club T4", wifi: "Free" }
};

// ========== 4. TAB SWITCHING ==========
function switchTab(viewId, btn) {
    ['view-search', 'view-tracker', 'view-layovers'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    const activeView = document.getElementById(viewId);
    if (activeView) activeView.classList.remove('hidden');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-blue-600');
        btn.classList.add('text-gray-400');
    });
    if (btn) {
        btn.classList.remove('text-gray-400');
        btn.classList.add('text-blue-600');
    }
}

// ========== 5. SEARCH FLIGHTS - LIVE PRICES IN UI ==========
async function searchFlight() {
    const from = document.getElementById('fromInput').value.trim().toUpperCase();
    const to = document.getElementById('destInput').value.trim().toUpperCase();
    
    if (!from || !to) {
        alert("Please enter both airports ✈️");
        return;
    }

    localStorage.setItem('lastSearchFrom', from);
    localStorage.setItem('lastSearchTo', to);

    const trending = document.getElementById('trendingSection');
    if (trending) trending.style.display = 'none';

    // Show airport intel
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
    } else if (infoText) {
        infoText.innerText = `✈️ Flying to ${to}. Compare prices below.`;
    }
    if (infoBox) infoBox.classList.remove('hidden');
    
    // Show loading state
    const container = document.getElementById('flightResults');
    container.innerHTML = `
        <div class="text-center py-12">
            <div class="loader mx-auto"></div>
            <p class="mt-4 text-gray-500 font-medium">Fetching live flight prices...</p>
            <p class="text-xs text-gray-400 mt-2">Checking ${from} → ${to}</p>
        </div>
    `;
    
    try {
        // Call your free backend API
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 30);
        const date = tomorrow.toISOString().split('T')[0];
        
        const response = await fetch(`${API_URL}/api/flights?from=${from}&to=${to}&date=${date}`);
        const data = await response.json();
        
        if (data.success && data.flights && data.flights.length > 0) {
            renderLiveFlightCards(data.flights, from, to);
        } else {
            container.innerHTML = `
                <div class="bg-yellow-50 rounded-2xl p-8 text-center border border-yellow-200">
                    <p class="text-yellow-700 font-medium">⚠️ No flights found for ${from} → ${to}</p>
                    <p class="text-sm text-yellow-600 mt-2">Try different airports or check back later</p>
                </div>
            `;
        }
    } catch (error) {
        console.error("Flight search error:", error);
        container.innerHTML = `
            <div class="bg-red-50 rounded-2xl p-8 text-center border border-red-200">
                <p class="text-red-600 font-medium">🔴 Unable to fetch live prices</p>
                <p class="text-sm text-red-500 mt-2">Please check your connection</p>
                <button onclick="searchFlight()" class="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg text-sm">Retry</button>
            </div>
        `;
    }
}

function renderLiveFlightCards(flights, from, to) {
    const container = document.getElementById('flightResults');
    container.innerHTML = '';
    
    // Add header with timestamp
    const timestamp = flights[0]?.lastUpdated || new Date().toLocaleTimeString();
    const header = document.createElement('div');
    header.className = 'text-right text-[10px] text-gray-400 mb-2';
    header.innerText = `🟢 Live prices • Updated ${timestamp}`;
    container.appendChild(header);
    
    flights.forEach((flight, idx) => {
        const isCheapest = idx === 0;
        const card = document.createElement('div');
        card.className = `bg-white rounded-2xl shadow-sm border ${isCheapest ? 'border-green-300 ring-2 ring-green-200' : 'border-gray-100'} p-5 mb-4 fade-in hover:shadow-md transition-all`;
        card.style.animationDelay = `${idx * 0.05}s`;
        
        const stopText = flight.stops === 0 ? "🟢 Direct" : `🔁 ${flight.stops} stop`;
        const priceColor = isCheapest ? "text-green-600" : "text-gray-900";
        const priceBadge = isCheapest ? '<span class="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded-lg ml-2">🏆 CHEAPEST</span>' : '';
        
        card.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-xs font-bold bg-blue-50 text-blue-700 px-3 py-1 rounded-lg">${flight.airline}</span>
                    ${priceBadge}
                </div>
                <div class="text-right">
                    <span class="text-2xl font-bold ${priceColor}">$${flight.price}</span>
                    <span class="text-[10px] text-gray-400 block">${flight.currency || 'USD'}</span>
                </div>
            </div>
            
            <div class="flex justify-between items-center mb-3">
                <div class="text-center">
                    <p class="text-xl font-bold text-gray-800">${flight.depTime}</p>
                    <p class="text-gray-400 text-[10px] font-bold mt-0.5">${from}</p>
                </div>
                <div class="flex-1 px-3 text-center">
                    <div class="text-gray-400 text-xs font-mono">✈️ ${flight.duration}</div>
                    <div class="w-full h-px bg-gray-200 my-1.5"></div>
                    <div class="text-[9px] text-gray-300 font-mono">${flight.flightNo}</div>
                </div>
                <div class="text-center">
                    <p class="text-xl font-bold text-gray-800">${flight.arrTime}</p>
                    <p class="text-gray-400 text-[10px] font-bold mt-0.5">${to}</p>
                </div>
            </div>
            
            <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-1 text-[10px] text-gray-500">
                    <span>🧳 ${flight.baggage || "20kg"}</span>
                    <span class="mx-1">•</span>
                    <span>${stopText}</span>
                </div>
                <button onclick="window.open('${flight.bookingUrl}', '_blank')" 
                        class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-all text-sm flex items-center justify-center gap-2">
                    ✈️ Book Now
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                </button>
            </div>
        `;
        container.appendChild(card);
    });
    
    // Add note about price freshness
    const note = document.createElement('div');
    note.className = 'text-center text-[10px] text-gray-400 mt-2 mb-8';
    note.innerHTML = `💡 Prices update daily. Click "Book Now" for final price on airline website.`;
    container.appendChild(note);
}

// ========== 6. FILL SEARCH FROM TRENDING ==========
function fillSearch(from, to) {
    document.getElementById('fromInput').value = from;
    document.getElementById('destInput').value = to;
    searchFlight();
}

// ========== 7. LIVE TRACKER ==========
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
    
    document.getElementById('trackerResult').innerHTML = `
        <div class="bg-green-50 border border-green-200 rounded-2xl p-4 text-left fade-in mt-4">
            <div class="flex items-center gap-2">
                <div class="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span class="font-bold text-green-700">Tracking ${flightNo}</span>
            </div>
            <p class="text-sm text-gray-600 mt-2">✅ FlightAware opened with real-time position and status.</p>
        </div>
    `;
    
    btn.innerText = originalText;
    btn.disabled = false;
}

// ========== 8. LAYOVER INTEL ==========
async function getLayoverIntel(btn) {
    const airport = document.getElementById('airportInput').value.trim().toUpperCase();
    if (!airport) return;
    
    const originalText = btn.innerText;
    btn.innerText = "🔍 Scanning...";
    
    await new Promise(r => setTimeout(r, 500));
    
    const intel = airportIntel[airport] || {
        tip: `Standard transit at ${airport}. Allow 2-3 hours for connections.`,
        bestLounge: "Check airport website for lounge access",
        wifi: "Free WiFi available"
    };
    
    document.getElementById('layoverResult').innerHTML = `
        <div class="bg-orange-50 border border-orange-200 rounded-2xl p-5 text-left fade-in mt-4">
            <h3 class="font-bold text-orange-800 text-lg mb-3">📍 ${airport} Intel</h3>
            <div class="space-y-2 text-sm">
                <p class="text-orange-700">💡 ${intel.tip}</p>
                <p class="text-orange-700">🛋️ Lounge: ${intel.bestLounge}</p>
                <p class="text-orange-700">📶 WiFi: ${intel.wifi}</p>
            </div>
        </div>
    `;
    
    btn.innerText = originalText;
}

// ========== 9. INITIALIZATION ==========
window.addEventListener('load', () => {
    const savedFrom = localStorage.getItem('lastSearchFrom');
    const savedTo = localStorage.getItem('lastSearchTo');
    
    if (savedFrom && savedTo) {
        document.getElementById('fromInput').value = savedFrom;
        document.getElementById('destInput').value = savedTo;
    }
    
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    const greetingEl = document.getElementById('greetingMsg');
    if (greetingEl) greetingEl.innerHTML = `${greeting}, Captain ✈️`;
});

// CSS
if (!document.querySelector('#flightpulse-styles')) {
    const style = document.createElement('style');
    style.id = 'flightpulse-styles';
    style.textContent = `
        .loader { width: 28px; height: 28px; border: 3px solid #e2e8f0; border-top-color: #2563EB; border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-pulse { animation: pulse 1.5s ease-in-out infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .fade-in { opacity: 0; animation: fadeIn 0.4s ease forwards; }
        @keyframes fadeIn { to { opacity: 1; } }
    `;
    document.head.appendChild(style);
}

console.log("✅ FlightPulse ready - Live prices in your UI!");
