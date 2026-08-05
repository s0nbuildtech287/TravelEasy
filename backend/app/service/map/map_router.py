# backend/app/service/map/map_router.py
from fastapi import APIRouter, Query
from app.service.map.google_places import search_nearby_places, geocode_address
from app.service.map.map_module import get_distance

# Tạo router cho API Bản đồ
router = APIRouter(tags=["Map API"])


# 🗺️ Endpoint: Tìm địa điểm gần vị trí chỉ định từ Google Places API
@router.get("/nearby")
async def nearby_places(
    lat: float,
    lng: float,
    radius: int = Query(1000, description="Bán kính tìm kiếm tính bằng mét (m)"),
    type: str = Query("restaurant", description="Loại địa điểm để quét (restaurant, lodging, tourist_attraction)")
):
    """
    API Nearby Search qua Google Places:
    - Nhận toạ độ lat, lng
    - Quét trực tiếp và trả về các địa điểm thực tế từ Google Maps

    Ví dụ:
    /map/nearby?lat=21.0285&lng=105.8542&radius=1000&type=restaurant
    """
    return await search_nearby_places(lat, lng, radius, type)


# 🚗 Endpoint: Tính khoảng cách & thời gian di chuyển
@router.get("/distance")
async def distance(
    origin: str = Query(..., description="Điểm bắt đầu (ví dụ: 'Hanoi')"),
    destination: str = Query(..., description="Điểm đến (ví dụ: 'Da Nang')")
):
    """
    API Directions:
    - Nhận chuỗi origin và destination
    - Trả về quãng đường và thời gian ước tính
    """
    return await get_distance(origin, destination)
