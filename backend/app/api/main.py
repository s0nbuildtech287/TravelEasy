# backend/app/api/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import time
import httpx
import asyncio
import json
import websockets
import math

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

# Bounding box covers the entire Southeast Asia region (Vietnam, Laos, Cambodia, Thailand, Malaysia, Singapore, Southern China)
VIETNAM_BOUNDS_STR = "24.5,1.0,99.0,114.0"

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
                
                # Evaluate Emergency Alerts & Holding Pattern Detections
                alerts = []
                for f in flights:
                    squawk = str(f.get("squawk", ""))
                    if squawk == "7700":
                        alerts.append({
                            "id": f"sq-7700-{f['icao']}",
                            "level": "CRITICAL",
                            "type": "SQUAWK_7700",
                            "callsign": f["callsign"],
                            "airline": f["airline"],
                            "title": "🚨 SQUAWK 7700: Sự cố Khẩn cấp Kỹ thuật",
                            "desc": f"Chuyến bay {f['callsign']} ({f['airline']}) vừa phát tín hiệu khẩn cấp 7700!"
                        })
                    elif squawk == "7600":
                        alerts.append({
                            "id": f"sq-7600-{f['icao']}",
                            "level": "WARNING",
                            "type": "SQUAWK_7600",
                            "callsign": f["callsign"],
                            "airline": f["airline"],
                            "title": "📻 SQUAWK 7600: Mất liên lạc Vô tuyến",
                            "desc": f"Chuyến bay {f['callsign']} mất tín hiệu liên lạc vô tuyến!"
                        })
                        
                    # Holding pattern detection near SGN or HAN
                    lat, lng = f["latitude"], f["longitude"]
                    alt = f["altitude_ft"]
                    dist_sgn = math.sqrt((lat - 10.8189)**2 + (lng - 106.6519)**2)
                    dist_han = math.sqrt((lat - 21.2212)**2 + (lng - 105.8072)**2)
                    
                    if (dist_sgn < 0.18 or dist_han < 0.18) and (3000 <= alt <= 14000):
                        ap_name = "Tân Sơn Nhất (SGN)" if dist_sgn < dist_han else "Nội Bài (HAN)"
                        alerts.append({
                            "id": f"holding-{f['icao']}",
                            "level": "INFO",
                            "type": "HOLDING_PATTERN",
                            "callsign": f["callsign"],
                            "airline": f["airline"],
                            "title": f"🔄 BAY VÒNG LƯỢN CHỜ HẠ CÁNH ({ap_name})",
                            "desc": f"Chuyến bay {f['callsign']} đang lượn vòng trên không chờ đường băng tại {ap_name}!"
                        })

                # Only overwrite cache if we successfully retrieved active flights.
                if len(flights) > 0:
                    flight_cache["data"] = flights
                    flight_cache["alerts"] = alerts
                    flight_cache["last_fetched"] = now
                    return {"flights": flights, "alerts": alerts, "source": "flightradar24"}
                else:
                    print("[DEBUG] Flightradar24 returned 0 flights. Retaining previous cached data.")
                    return {"flights": flight_cache["data"], "alerts": flight_cache.get("alerts", []), "source": "cache_fallback"}
    except Exception as e:
        print(f"[ERROR] Failed to query Flightradar24: {e}")
        return {"flights": flight_cache.get("data", []), "source": "cache_fallback"}
        
# Airport Coordinates Registry for Full Departure Trail Construction
AIRPORT_COORDS = {
    "HAN": (21.2212, 105.8072),
    "SGN": (10.8189, 106.6519),
    "DAD": (16.0439, 108.1994),
    "SIN": (1.3644, 103.9915),
    "BKK": (13.6900, 100.7500),
    "KUL": (2.7456, 101.7099),
    "HKG": (22.3080, 113.9149),
    "PNH": (11.5466, 104.8442),
    "VTE": (17.9883, 102.5633)
}

@app.get("/api/flights/{icao}/track", tags=["Flights"])
async def get_flight_track(icao: str):
    icao_lower = icao.lower()
    trail_points = []
    
    # 1. Try querying OpenSky Live Track API
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(
                f"https://opensky-network.org/api/tracks/all?icao24={icao_lower}&time=0",
                headers={"User-Agent": "Mozilla/5.0"}
            )
            if resp.status_code == 200:
                track_data = resp.json()
                raw_path = track_data.get("path", [])
                for p in raw_path:
                    # OpenSky path point format: [time, lat, lng, alt_m, heading, on_ground]
                    if len(p) >= 4 and p[1] is not None and p[2] is not None:
                        alt_ft = round(p[3] * 3.28084) if p[3] is not None else 0
                        trail_points.append({
                            "lat": p[1],
                            "lng": p[2],
                            "altitude_ft": alt_ft,
                            "time": p[0]
                        })
    except Exception as e:
        print(f"[TRACK] OpenSky track query failed: {e}")

    # 2. Find target flight in cache to get Origin & Current Position
    target = None
    for f in flight_cache.get("data", []):
        if f["icao"].lower() == icao_lower:
            target = f
            break
            
    # 3. If trail points were empty or sparse, construct full smooth trajectory from Origin Airport
    if target:
        origin_code = target.get("origin")
        curr_lat = target["latitude"]
        curr_lng = target["longitude"]
        curr_alt = target["altitude_ft"]
        
        # If we have origin airport coords, insert origin departure point at the start of track
        if origin_code in AIRPORT_COORDS:
            orig_lat, orig_lng = AIRPORT_COORDS[origin_code]
            
            # Interpolate 6 intermediate waypoints between Origin and Current Position if trail is empty
            if len(trail_points) == 0:
                for i in range(7):
                    ratio = i / 6.0
                    interp_lat = round(orig_lat + (curr_lat - orig_lat) * ratio, 4)
                    interp_lng = round(orig_lng + (curr_lng - orig_lng) * ratio, 4)
                    interp_alt = round(curr_alt * ratio)
                    trail_points.append({
                        "lat": interp_lat,
                        "lng": interp_lng,
                        "altitude_ft": interp_alt
                    })
            else:
                # Ensure the very first point of the track is the departure airport
                if math.sqrt((trail_points[0]["lat"] - orig_lat)**2 + (trail_points[0]["lng"] - orig_lng)**2) > 0.05:
                    trail_points.insert(0, {
                        "lat": orig_lat,
                        "lng": orig_lng,
                        "altitude_ft": 0
                    })
                    
    return {
        "icao": icao,
        "track": trail_points,
        "count": len(trail_points)
    }

@app.get("/api/airports/{code}/fids", tags=["Airports"])
async def get_airport_fids(code: str):
    code_upper = code.upper()
    departures = []
    arrivals = []
    
    for f in flight_cache.get("data", []):
        orig = f.get("origin", "")
        dest = f.get("destination", "")
        
        # Flight departing from this airport
        if orig == code_upper or (orig == "" and f.get("altitude_ft", 0) < 5000):
            status = "ĐÃ CẤT CÁNH (AIRBORNE)" if f["altitude_ft"] > 3000 else "ĐANG RA ĐƯỜNG BĂNG (TAXIING)"
            departures.append({
                "callsign": f["callsign"],
                "airline": f["airline"],
                "aircraft": f["aircraft"],
                "destination": dest if dest else "QUỐC TẾ",
                "altitude_ft": f["altitude_ft"],
                "speed_kmh": f["speed_kmh"],
                "gate": f"G{abs(hash(f['callsign'])) % 18 + 1}",
                "status": status
            })
            
        # Flight arriving at this airport
        if dest == code_upper or (dest == "" and f.get("altitude_ft", 0) > 0 and f.get("altitude_ft", 0) < 15000):
            status = "ĐANG HẠ CÁNH (FINAL)" if f["altitude_ft"] < 5000 else "ĐANG TIẾP CẬN (APPROACH)"
            arrivals.append({
                "callsign": f["callsign"],
                "airline": f["airline"],
                "aircraft": f["aircraft"],
                "origin": orig if orig else "QUỐC TẾ",
                "altitude_ft": f["altitude_ft"],
                "speed_kmh": f["speed_kmh"],
                "belt": f"B{abs(hash(f['callsign'])) % 6 + 1}",
                "status": status
            })
            
    return {
        "airport": code_upper,
        "departures": departures[:12],
        "arrivals": arrivals[:12],
        "dep_count": len(departures),
        "arr_count": len(arrivals)
    }

ATC_CHANNELS = [
    {
        "id": "sgn_twr",
        "code": "SGN",
        "airport": "Tân Sơn Nhất (TP.HCM)",
        "freq": "118.700 MHz",
        "type": "TOWER / GROUND",
        "stream_url": "https://s1-fmtg.liveatc.net/vtsm_twr",
        "status": "LIVE"
    },
    {
        "id": "han_twr",
        "code": "HAN",
        "airport": "Nội Bài (Hà Nội)",
        "freq": "118.900 MHz",
        "type": "TOWER / APPROACH",
        "stream_url": "https://s1-fmtg.liveatc.net/vvnb_twr",
        "status": "LIVE"
    },
    {
        "id": "dad_twr",
        "code": "DAD",
        "airport": "Đà Nẵng",
        "freq": "118.100 MHz",
        "type": "TOWER",
        "stream_url": "https://s1-fmtg.liveatc.net/vvdn_twr",
        "status": "LIVE"
    },
    {
        "id": "sin_twr",
        "code": "SIN",
        "airport": "Changi Singapore",
        "freq": "118.600 MHz",
        "type": "TOWER",
        "stream_url": "https://s1-bos.liveatc.net/wsss_twr",
        "status": "LIVE"
    }
]

from fastapi.responses import StreamingResponse

@app.get("/api/atc/channels", tags=["ATC Scanner"])
async def get_atc_channels():
    # Update stream_url to use proxy endpoint for CORS & referrer bypass
    proxied_channels = []
    for c in ATC_CHANNELS:
        ch = c.copy()
        ch["proxy_url"] = f"/api/atc/stream/{c['id']}"
        proxied_channels.append(ch)
    return {"channels": proxied_channels, "count": len(proxied_channels)}

@app.get("/api/atc/stream/{channel_id}", tags=["ATC Scanner"])
async def stream_atc_audio(channel_id: str):
    channel = next((c for c in ATC_CHANNELS if c["id"] == channel_id or c["code"].lower() == channel_id.lower()), None)
    if not channel:
        channel = ATC_CHANNELS[0]
    
    stream_url = channel["stream_url"]
    
    async def audio_generator():
        try:
            async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Referer": "https://www.liveatc.net/"
                }
                async with client.stream("GET", stream_url, headers=headers) as response:
                    async for chunk in response.aiter_bytes(chunk_size=4096):
                        yield chunk
        except Exception as e:
            print(f"[ATC STREAM ERROR] {e}")

    return StreamingResponse(audio_generator(), media_type="audio/mpeg")

# Global dictionary to store ship positions from AISStream
ship_cache = {}
ais_task = None

async def ais_receiver_task():
    uri = "wss://stream.aisstream.io/v0/stream"
    api_key = os.getenv("AIS_API_KEY", "3a51e169661eaabdf468d77c959ffed4c72e9c54")
    
    while True:
        try:
            print("[AIS] Connecting to AISStream.io...", flush=True)
            async with websockets.connect(uri, ping_interval=20, ping_timeout=20) as websocket:
                subscribe_message = {
                    "APIKey": api_key,
                    "BoundingBoxes": [[[-90.0, -180.0], [90.0, 180.0]]]
                }
                await websocket.send(json.dumps(subscribe_message))
                print("[AIS] Subscription message sent successfully!", flush=True)
                
                async for message in websocket:
                    data = json.loads(message)
                    metadata = data.get("MetaData", {})
                    mmsi = str(metadata.get("MMSI"))
                    ship_name = metadata.get("ShipName", "").strip() or f"MMSI: {mmsi}"
                    
                    pos_report = data.get("Message", {}).get("PositionReport", {})
                    lat = metadata.get("latitude") # read from lowercase metadata coordinates
                    lng = metadata.get("longitude")
                    heading = pos_report.get("TrueHeading", 0)
                    speed = pos_report.get("SOG", 0) # speed over ground (SOG is capitalized in JSON)
                    
                    if lat is not None and lng is not None:
                        ship_cache[mmsi] = {
                            "mmsi": mmsi,
                            "name": ship_name,
                            "latitude": lat,
                            "longitude": lng,
                            "heading": heading if heading <= 360 else 0,
                            "speed": speed,
                            "type": metadata.get("ShipType", 0),
                            "last_updated": time.time()
                        }
                        print(f"[AIS] Parsed ship: {ship_name} (MMSI: {mmsi}) at [{lat}, {lng}]", flush=True)
        except Exception as e:
            print(f"[AIS] Connection failed/lost: {e}. Reconnecting in 5 seconds...", flush=True)
            await asyncio.sleep(5)

def start_ais_task():
    global ais_task
    if ais_task is None or ais_task.done():
        print("[AIS] Starting background task...", flush=True)
        ais_task = asyncio.create_task(ais_receiver_task())

@app.on_event("startup")
async def startup_event():
    start_ais_task()

DEFAULT_SHIPS = [
    {"mmsi": "574001230", "name": "HAIPHONG EXPRESS", "latitude": 20.8651, "longitude": 106.6838, "heading": 120, "speed": 14.5, "type": 70, "flag": "🇻🇳 Việt Nam"},
    {"mmsi": "574002340", "name": "VUNGTAU STAR", "latitude": 10.5367, "longitude": 107.0256, "heading": 45, "speed": 12.0, "type": 80, "flag": "🇻🇳 Việt Nam"},
    {"mmsi": "574003450", "name": "DANANG FORTUNE", "latitude": 16.0825, "longitude": 108.2241, "heading": 180, "speed": 16.2, "type": 70, "flag": "🇻🇳 Việt Nam"},
    {"mmsi": "574004560", "name": "BIEN DONG PACIFIC", "latitude": 15.5000, "longitude": 111.0000, "heading": 210, "speed": 18.5, "type": 70, "flag": "🇻🇳 Việt Nam"},
    {"mmsi": "563001890", "name": "SINGAPORE CHIEF", "latitude": 1.2644, "longitude": 103.8400, "heading": 270, "speed": 15.0, "type": 70, "flag": "🇸🇬 Singapore"},
    {"mmsi": "477005670", "name": "HONGKONG TRADER", "latitude": 22.2855, "longitude": 114.1577, "heading": 90, "speed": 13.8, "type": 70, "flag": "🇭🇰 Hong Kong"},
    {"mmsi": "574006780", "name": "QUYNHON TRADER", "latitude": 13.7750, "longitude": 109.2300, "heading": 150, "speed": 11.5, "type": 70, "flag": "🇻🇳 Việt Nam"},
    {"mmsi": "574007890", "name": "SAIGON OIL TANKER", "latitude": 10.3500, "longitude": 107.0500, "heading": 30, "speed": 10.5, "type": 80, "flag": "🇻🇳 Việt Nam"}
]

@app.get("/api/ships", tags=["Ships"])
async def get_ships():
    # Auto-start task if uvicorn reloaded and bypassed startup
    start_ais_task()
    
    # Remove ships that haven't updated in 120 seconds to keep data clean
    now = time.time()
    stale_mmsis = [mmsi for mmsi, ship in ship_cache.items() if now - ship["last_updated"] > 120]
    for mmsi in stale_mmsis:
        del ship_cache[mmsi]
        
    ships_list = list(ship_cache.values())
    if len(ships_list) == 0:
        ships_list = DEFAULT_SHIPS
        
    return {
        "ships": ships_list,
        "count": len(ships_list)
    }

# Static Files serving React Frontend
frontend_dist_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend", "dist"))
assets_path = os.path.join(frontend_dist_path, "assets")

if os.path.exists(assets_path):
    app.mount("/assets", StaticFiles(directory=assets_path), name="assets")

@app.api_route("/", methods=["GET", "HEAD"], tags=["Static"])
async def serve_root():
    index_file = os.path.join(frontend_dist_path, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "Frontend build files not found! Please build the frontend first."}

@app.get("/{catchall:path}", tags=["Static"])
async def serve_frontend(catchall: str):
    if catchall.startswith("api/") or catchall.startswith("docs") or catchall.startswith("openapi.json"):
        return {"error": "Not Found"}
        
    # Check if the requested file exists in the frontend dist root (e.g. favicon.svg)
    file_path = os.path.join(frontend_dist_path, catchall)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
        
    index_file = os.path.join(frontend_dist_path, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "Frontend build files not found! Please build the frontend first."}