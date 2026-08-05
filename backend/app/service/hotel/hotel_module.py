# backend/app/service/hotel/hotel_module.py
import math
from app.service.map.google_places import search_nearby_places


def haversine(lat1, lon1, lat2, lon2):
    try:
        R = 6371
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(
            dlon / 2
        ) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c
    except:
        return float("inf")


async def get_hotels_by_coords(latitude: float, longitude: float, place_name: str = "", radius_km: float = 2.0):
    """
    Quét tìm khách sạn thực tế xung quanh toạ độ được gửi từ Frontend bằng Google Places API.
    """
    # Đổi bán kính sang mét (tối đa 50km)
    radius_meters = min(int(radius_km * 1000), 50000)

    # Gọi Google Places quét khách sạn thực tế (type="lodging")
    search_res = await search_nearby_places(latitude, longitude, radius_meters, "lodging")
    raw_hotels = search_res.get("results", [])

    results = []
    for item in raw_hotels:
        dist = haversine(item["latitude"], item["longitude"], latitude, longitude)

        results.append({
            "id": item["id"],
            "hotel": item["name"],
            "address": item["address"],
            "latitude": item["latitude"],
            "longitude": item["longitude"],
            "link": item["google_maps_link"],
            "description": f"Cách {place_name or 'điểm mốc'} {dist:.1f}km",
            "distance": dist
        })

    # Sắp xếp khách sạn theo khoảng cách gần nhất
    results.sort(key=lambda x: x["distance"])
    return results[:6]
