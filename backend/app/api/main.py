# backend/app/api/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import time
import httpx

app = FastAPI(
    title="TravelEasy Flight Radar",
    description="Real-time Flight Radar/Tracker API Server using Flightradar24 Feed",
    version="1.1.0"
)

# CORS middleware for development compatibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Bounds format: "north,south,west,east" for Flightradar24
# Bounding box covers Vietnam and its surrounding maritime/land borders
VIETNAM_BOUNDS_STR = "24.5,7.5,99.5,112.5"

# Memory cache to respect server limits
flight_cache = {
    "last_fetched": 0.0,
    "data": []
}
CACHE_DURATION_SECONDS = 5.0

AIRLINES_MAP = {
    "HVN": "Vietnam Airlines",
    "VJC": "VietJet Air",
    "BAV": "Bamboo Airways",
    "VOT": "Vietravel Airlines",
    "SIA": "Singapore Airlines",
    "THA": "Thai Airways",
    "CPA": "Cathay Pacific",
    "MAS": "Malaysia Airlines",
    "CAL": "China Airlines",
    "EVA": "EVA Air",
    "ANA": "All Nippon Airways",
    "JAL": "Japan Airlines",
    "QTR": "Qatar Airways",
    "UAE": "Emirates",
    "CSN": "China Southern Airlines",
    "CES": "China Eastern Airlines",
    "CCA": "Air China"
}

@app.get("/api/health", tags=["System"])
def health():
    return {"status": "ok"}

@app.get("/api/flights", tags=["Flights"])
async def get_flights():
    """
    Get all active flights in Vietnam airspace.
    Results are fetched from Flightradar24's public feed and cached for 5 seconds.
    """
    now = time.time()
    if now - flight_cache["last_fetched"] < CACHE_DURATION_SECONDS:
        return {"flights": flight_cache["data"], "source": "cache"}

    url = "https://data-cloud.flightradar24.com/zones/fcgi/feed.js"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "Accept-Language": "en-US,en;q=0.9",
        "Origin": "https://www.flightradar24.com",
        "Referer": "https://www.flightradar24.com/"
    }
    params = {
        "bounds": VIETNAM_BOUNDS_STR,
        "faa": "1",
        "satellite": "1",
        "mlat": "1",
        "flac": "1",
        "adsb": "1",
        "gnd": "1",
        "air": "1",
        "vehicles": "0",
        "estimated": "1",
        "maxage": "14400",
        "gliders": "0",
        "stats": "0"
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, params=params, timeout=8.0)
            print(f"[DEBUG] Flightradar24 HTTP Status: {response.status_code}, Body length: {len(response.text)}")
            if response.status_code == 200:
                raw_data = response.json()
                print(f"[DEBUG] Keys in raw_data: {list(raw_data.keys())[:10]}")
                
                flights = []
                for key, value in raw_data.items():
                    # Each active flight is a list of parameters
                    if isinstance(value, list) and len(value) >= 19:
                        icao = value[0]
                        lat = value[1]
                        lng = value[2]
                        heading = value[3]
                        altitude_ft = value[4]
                        speed_kt = value[5]
                        aircraft_type = value[8]
                        registration = value[9]
                        origin = value[11]
                        destination = value[12]
                        callsign = value[16].strip() if value[16] else "UNKNOWN"
                        airline_code = value[18]
                        
                        # Only include airborne/valid coordinates
                        if lat is not None and lng is not None:
                            speed_kmh = round(speed_kt * 1.852, 1) if speed_kt is not None else 0.0
                            altitude_m = round(altitude_ft / 3.28084, 1) if altitude_ft is not None else 0.0
                            
                            # Resolve Airline name
                            airline = AIRLINES_MAP.get(airline_code, airline_code if airline_code else "General Aviation")
                            
                            flights.append({
                                "icao": icao,
                                "callsign": callsign,
                                "airline": airline,
                                "country": "N/A",  # FR24 feed does not return registration country directly
                                "latitude": lat,
                                "longitude": lng,
                                "altitude_m": altitude_m,
                                "altitude_ft": altitude_ft,
                                "speed_kmh": speed_kmh,
                                "heading": heading if heading is not None else 0.0,
                                "vertical_rate_ms": 0.0,  # FR24 standard feed doesn't contain vertical rate directly
                                "on_ground": altitude_ft == 0,
                                "origin": origin,
                                "destination": destination,
                                "aircraft": aircraft_type,
                                "registration": registration
                            })
                
                print(f"[DEBUG] Parsed flights count: {len(flights)}")
                
                # Only overwrite cache if we successfully retrieved active flights.
                # If the API returns 0 flights (due to rate limiting or connection drop),
                # preserve the last cached flight vectors so the map remains populated.
                if len(flights) > 0:
                    flight_cache["data"] = flights
                    flight_cache["last_fetched"] = now
                    return {"flights": flights, "source": "flightradar24"}
                else:
                    print("[DEBUG] Flightradar24 returned 0 flights. Retaining previous cached data.")
                    return {"flights": flight_cache["data"], "source": "cache_fallback"}
    except Exception as e:
        print(f"[ERROR] Failed to query Flightradar24: {e}")
        
    return {"flights": flight_cache["data"], "source": "cache_fallback"}

# Static Files serving React Frontend
frontend_dist_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend", "dist"))
assets_path = os.path.join(frontend_dist_path, "assets")

if os.path.exists(assets_path):
    app.mount("/assets", StaticFiles(directory=assets_path), name="assets")

@app.get("/", tags=["Static"])
async def serve_root():
    index_file = os.path.join(frontend_dist_path, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "Frontend build files not found! Please build the frontend first."}

@app.get("/{catchall:path}", tags=["Static"])
async def serve_frontend(catchall: str):
    if catchall.startswith("api/") or catchall.startswith("docs") or catchall.startswith("openapi.json"):
        return {"error": "Not Found"}
        
    index_file = os.path.join(frontend_dist_path, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "Frontend build files not found! Please build the frontend first."}