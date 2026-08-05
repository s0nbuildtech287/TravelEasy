# backend/app/service/itinerary/itinerary_module.py

from fastapi import HTTPException
from typing import List, Dict, Any
from app.api.rag_itinerary_module import generate_itinerary_rag


def process_itinerary_request(
    province: str,
    days: int,
    preferences: Dict,
    places: List[Dict[str, Any]]
):
    if days <= 0:
        raise HTTPException(status_code=400, detail="Số ngày phải > 0")

    # Chuyển tiếp thẳng đến bộ sinh lịch trình động của Gemini
    return generate_itinerary_rag(
        province=province,
        days=days,
        preferences=preferences,
        places=places
    )