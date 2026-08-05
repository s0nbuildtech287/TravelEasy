# backend/app/service/hotel/hotel_router.py
from fastapi import APIRouter
from app.service.tourism.tourism_module import get_all_provinces
from .hotel_module import get_hotels_by_province_and_place_id

router = APIRouter(tags=["Hotels"])


@router.get("/provinces")
def api_get_provinces():
    return get_all_provinces()


@router.get("/")
async def api_recommend_hotels(place_id: int, radius: float = 50.0):
    """
    🔍 TÌM KHÁCH SẠN GẦN ĐỊA ĐIỂM VUI CHƠI (GOOGLE PLACES)

    API này hoạt động theo cơ chế tìm kiếm thời gian thực:
    1. Nhận place_id từ frontend.
    2. Lấy tọa độ địa điểm đó từ bộ nhớ tĩnh JSONL.
    3. Quét Google Places API tìm kiếm khách sạn thực tế trong bán kính và trả về.
    """
    return await get_hotels_by_province_and_place_id(place_id, radius_km=radius)