# backend/app/service/hotel/hotel_router.py
from fastapi import APIRouter
from app.service.tourism.tourism_module import get_all_provinces
from .hotel_module import get_hotels_by_coords

router = APIRouter(tags=["Hotels"])


@router.get("/provinces")
def api_get_provinces():
    return get_all_provinces()


@router.get("/")
async def api_recommend_hotels(latitude: float, longitude: float, place_name: str = "", radius: float = 2.0):
    """
    🔍 TÌM KHÁCH SẠN GẦN TOẠ ĐỘ (GOOGLE PLACES)
    """
    return await get_hotels_by_coords(latitude, longitude, place_name=place_name, radius_km=radius)