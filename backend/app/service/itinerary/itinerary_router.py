# backend/app/service/itinerary/itinerary_router.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
from app.service.tourism.tourism_module import get_places_by_subcategories
from app.service.itinerary.itinerary_module import process_itinerary_request

router = APIRouter(tags=["Itinerary AI"])


# ---- INPUT MODEL (Trip Profile) ----
class ItineraryPreferences(BaseModel):
    interests: List[str] = []                # Loại hình du lịch mong muốn
    pace: Optional[str] = "Vừa phải"         # Nhịp độ chuyến đi
    group_type: Optional[str] = "Gia đình"   # Nhóm khách đi cùng
    avoid_categories: List[str] = []         # Điểm/loại hình muốn tránh
    time_preferences: Dict[str, List[str]] = {}  # Thời gian mong muốn


class ItineraryRequest(BaseModel):
    province: str
    days: int
    preferences: ItineraryPreferences


# ---- API: /generate ----
@router.post("/generate")
async def generate_itinerary(req: ItineraryRequest):
    """
    Tạo lịch trình du lịch thông minh động qua Google Places API & Gemini AI.
    """
    if req.days <= 0:
        raise HTTPException(status_code=400, detail="Số ngày phải lớn hơn 0")

    # Lấy địa điểm động từ Google Places API
    place_dicts = await get_places_by_subcategories(req.province, [])

    if not place_dicts:
        # Nếu Google Places không tìm thấy địa điểm, chúng ta vẫn chuyển một list trống
        # để Gemini tự biên soạn lịch trình dựa trên kiến thức của nó!
        place_dicts = []

    # Điền giá trị mặc định cho cấu trúc
    for p in place_dicts:
        if "sub_category" not in p:
            p["sub_category"] = []
        if "highlights" not in p:
            p["highlights"] = []
        if "activities" not in p:
            p["activities"] = []

    return process_itinerary_request(
        province=req.province,
        days=req.days,
        preferences=req.preferences.dict(),
        places=place_dicts
    )