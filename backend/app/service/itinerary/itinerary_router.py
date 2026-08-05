# backend/app/service/itinerary/itinerary_router.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
from app.service.tourism.tourism_module import get_places_by_subcategories
from app.service.itinerary.itinerary_module import process_itinerary_request

router = APIRouter(tags=["Itinerary RAG"])


# ---- INPUT MODEL (Trip Profile) ----
class ItineraryPreferences(BaseModel):
    interests: List[str] = []                # match: category, sub_category, activities
    pace: Optional[str] = None               # slow/medium/fast
    group_type: Optional[str] = None         # family/couple/adventure
    avoid_categories: List[str] = []         # match: tags/category
    time_preferences: Dict[str, List[str]] = {}   # morning/afternoon/evening → activities


class ItineraryRequest(BaseModel):
    province: str
    days: int
    preferences: ItineraryPreferences


# ---- API: /itinerary/generate ----
@router.post("/generate")
def generate_itinerary(req: ItineraryRequest):

    if req.days <= 0:
        raise HTTPException(status_code=400, detail="Số ngày phải > 0")

    # Lấy địa điểm theo province từ JSONL trực tiếp
    place_dicts = get_places_by_subcategories(req.province, [])

    if not place_dicts:
        raise HTTPException(status_code=404, detail="Không tìm thấy địa điểm nào theo tỉnh yêu cầu.")

    # Đảm bảo các trường có cấu trúc đúng định dạng
    for p in place_dicts:
        if "sub_category" not in p or p["sub_category"] is None:
            p["sub_category"] = []
        if "highlights" not in p or p["highlights"] is None:
            p["highlights"] = []
        if "activities" not in p or p["activities"] is None:
            p["activities"] = []
        if "special_for" not in p or p["special_for"] is None:
            p["special_for"] = []
        if "seasonal_events" not in p or p["seasonal_events"] is None:
            p["seasonal_events"] = []
        if "tags" not in p or p["tags"] is None:
            p["tags"] = []

    return process_itinerary_request(
        province=req.province,
        days=req.days,
        preferences=req.preferences.dict(),
        places=place_dicts
    )