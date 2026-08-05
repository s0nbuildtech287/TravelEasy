# backend/app/service/tourism/tourism_module.py
import os
from typing import List, Dict, Any

POPULAR_PROVINCES = [
    "Hà Giang", "Hà Nội", "Đà Nẵng", "Sapa", "Hạ Long", "Ninh Bình", 
    "Huế", "Hội An", "Nha Trang", "Đà Lạt", "Mũi Né", "Phú Quốc", "Hồ Chí Minh"
]


def get_all_provinces() -> List[str]:
    """
    Trả về danh sách các tỉnh thành phổ biến của Việt Nam.
    """
    return POPULAR_PROVINCES


def get_category_tree_by_province(province: str) -> Dict[str, List[str]]:
    """
    Trả về cây danh mục mặc định để lọc trên UI.
    """
    return {
        "Tham Quan": ["Danh lam thắng cảnh", "Di tích lịch sử", "Chùa", "Khu du lịch sinh thái", "Bảo tàng"],
        "Ẩm Thực": ["Nhà hàng", "Quán cafe ngon", "Quán ăn đặc sản"],
        "Lưu Trú": ["Khách sạn", "Homestay đẹp", "Resort"]
    }


async def get_places_by_subcategories(province: str, selected_subcats: List[str]) -> List[Dict[str, Any]]:
    """
    Tìm kiếm địa điểm du lịch động qua Google Places Text Search.
    """
    from app.service.map.google_places import search_text_places

    # Tạo truy vấn tìm kiếm dựa trên danh mục được chọn
    if selected_subcats:
        query = f"{selected_subcats[0]} tại {province}"
    else:
        query = f"Địa điểm du lịch nổi tiếng tại {province}"

    print(f"[Google Places] Querying: '{query}'")
    res = await search_text_places(query)
    raw_results = res.get("results", [])

    places = []
    for item in raw_results:
        # Gán danh mục
        category = "Tham Quan"
        if selected_subcats:
            sub_category = selected_subcats
            # Nhận dạng loại địa điểm
            if any(kwd in selected_subcats[0].lower() for kwd in ["nhà hàng", "quán ăn", "ẩm thực"]):
                category = "Ẩm Thực"
            elif any(kwd in selected_subcats[0].lower() for kwd in ["khách sạn", "homestay", "resort"]):
                category = "Lưu Trú"
        else:
            sub_category = ["Danh lam thắng cảnh"]

        places.append({
            "id": item["id"],
            "name": item["name"],
            "latitude": item["latitude"],
            "longitude": item["longitude"],
            "address": item["address"],
            "rating": item["rating"],
            "review_count": item["review_count"],
            "image_url": item["image_url"],
            "google_maps_link": item["google_maps_link"],
            "description": f"Một địa điểm nổi bật nằm tại {province}. Được du khách đánh giá cao ({item['rating']}⭐ từ {item['review_count']} lượt review trên Google Maps).",
            "category": category,
            "sub_category": sub_category,
            "open_hours": "Tự do hoặc theo giờ hoạt động của địa điểm"
        })

    return places