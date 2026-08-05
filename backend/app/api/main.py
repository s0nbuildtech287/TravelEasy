# backend/app/api/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from app.service.map.map_router import router as map_router
from app.service.weather.weather_router import router as weather_router
from app.service.foods.food_router import router as food_router
from app.service.hotel.hotel_router import router as hotel_router
from app.service.tourism.tourism_router import router as tourism_router
from app.service.itinerary.itinerary_router import router as itinerary_router

app = FastAPI(
    title="TravelEasy System",
    description="API Server for TravelEasy System",
    version="2.0.0"
)

# CORS middleware for development compatibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routes
@app.get("/api/health", tags=["System"])
def health():
    return {"status": "ok"}

app.include_router(tourism_router, prefix="/api/tourism", tags=["Tourism"])
app.include_router(itinerary_router, prefix="/api/itinerary", tags=["Itinerary AI"])
app.include_router(map_router, prefix="/api/map", tags=["Map"])
app.include_router(weather_router, prefix="/api/weather", tags=["Weather"])
app.include_router(food_router, prefix="/api/foods", tags=["Foods"])
app.include_router(hotel_router, prefix="/api/hotels", tags=["Hotels"])

# Static Files serving Svelte Frontend
# The frontend static files are compiled into backend/../frontend/dist
frontend_dist_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend", "dist"))
assets_path = os.path.join(frontend_dist_path, "assets")

# Mount assets subdirectory if it exists
if os.path.exists(assets_path):
    app.mount("/assets", StaticFiles(directory=assets_path), name="assets")

# Serves index.html at root
@app.get("/", tags=["Static"])
async def serve_root():
    index_file = os.path.join(frontend_dist_path, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "Frontend build files not found! Please build the frontend first."}

# Serves index.html for Svelte SPA paths (catch-all)
@app.get("/{catchall:path}", tags=["Static"])
async def serve_frontend(catchall: str):
    # Skip API routes from being handled by frontend catch-all
    if catchall.startswith("api/") or catchall.startswith("docs") or catchall.startswith("openapi.json"):
        return {"error": "Not Found"}
        
    index_file = os.path.join(frontend_dist_path, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "Frontend build files not found! Please build the frontend first."}