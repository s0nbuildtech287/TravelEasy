# backend/app/service/map/google_places.py
import os
import httpx
from dotenv import load_dotenv

# Nạp file .env ngay khi import module
load_dotenv()


async def search_nearby_places(lat: float, lng: float, radius: int = 1000, place_type: str = "restaurant"):
    """
    Tìm kiếm địa điểm xung quanh bằng Google Places API (Nearby Search Legacy).
    - lat, lng: Tọa độ trung tâm
    - radius: Bán kính tìm kiếm (mét)
    - place_type: Loại địa điểm (restaurant, lodging, tourist_attraction)
    """
    api_key = os.getenv("GOOGLE_PLACES_API_KEY")
    if not api_key or api_key == "YOUR_GOOGLE_PLACES_API_KEY_HERE":
        print("[WARN] GOOGLE_PLACES_API_KEY chưa được cấu hình. Trả về kết quả tìm kiếm rỗng.")
        return {"results": []}

    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = {
        "location": f"{lat},{lng}",
        "radius": radius,
        "type": place_type,
        "key": api_key,
        "language": "vi"
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params)
            data = response.json()
            status = data.get("status")
            if status != "OK" and status != "ZERO_RESULTS":
                print(f"[WARN] Google Places Nearby Search status: {status}. Message: {data.get('error_message')}")

            raw_results = data.get("results", [])
            places = []
            for item in raw_results:
                lat_p = item.get("geometry", {}).get("location", {}).get("lat")
                lng_p = item.get("geometry", {}).get("location", {}).get("lng")
                google_maps_link = f"https://www.google.com/maps?q={lat_p},{lng_p}" if lat_p and lng_p else ""

                # Lấy link ảnh từ photo reference
                image_url = None
                photos = item.get("photos", [])
                if photos:
                    photo_ref = photos[0].get("photo_reference")
                    if photo_ref:
                        image_url = f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference={photo_ref}&key={api_key}"

                places.append({
                    "id": item.get("place_id"),
                    "name": item.get("name"),
                    "latitude": lat_p,
                    "longitude": lng_p,
                    "address": item.get("vicinity", "Không rõ địa chỉ"),
                    "rating": item.get("rating", 0.0),
                    "review_count": item.get("user_ratings_total", 0),
                    "image_url": image_url,
                    "google_maps_link": google_maps_link,
                    "price_level": item.get("price_level", None)
                })
            return {"results": places}
    except Exception as e:
        print(f"[ERROR] Thất bại khi quét Google Places API: {e}")
        return {"results": []}


async def geocode_address(address: str):
    """
    Chuyển địa chỉ bằng chữ sang tọa độ (Geocoding API).
    """
    api_key = os.getenv("GOOGLE_PLACES_API_KEY")
    if not api_key or api_key == "YOUR_GOOGLE_PLACES_API_KEY_HERE":
        print("[WARN] GOOGLE_PLACES_API_KEY chưa được cấu hình. Geocoding sẽ thất bại.")
        return None

    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {
        "address": address,
        "key": api_key,
        "language": "vi"
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            results = data.get("results", [])
            if results:
                location = results[0].get("geometry", {}).get("location", {})
                return {
                    "lat": location.get("lat"),
                    "lng": location.get("lng"),
                    "address": results[0].get("formatted_address")
                }
    except Exception as e:
        print(f"[ERROR] Geocoding thất bại: {e}")
    return None


async def search_text_places(query: str):
    """
    Tìm kiếm địa điểm bằng chữ (Text Search API).
    """
    api_key = os.getenv("GOOGLE_PLACES_API_KEY")
    if not api_key or api_key == "YOUR_GOOGLE_PLACES_API_KEY_HERE":
        print("[WARN] GOOGLE_PLACES_API_KEY chưa được cấu hình. Trả về rỗng.")
        return {"results": []}

    url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    params = {
        "query": query,
        "key": api_key,
        "language": "vi"
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params)
            data = response.json()
            status = data.get("status")
            if status != "OK" and status != "ZERO_RESULTS":
                print(f"[WARN] Google Places Text Search status: {status}. Message: {data.get('error_message')}")

            raw_results = data.get("results", [])
            places = []
            for item in raw_results:
                lat_p = item.get("geometry", {}).get("location", {}).get("lat")
                lng_p = item.get("geometry", {}).get("location", {}).get("lng")
                google_maps_link = f"https://www.google.com/maps?q={lat_p},{lng_p}" if lat_p and lng_p else ""

                image_url = None
                photos = item.get("photos", [])
                if photos:
                    photo_ref = photos[0].get("photo_reference")
                    if photo_ref:
                        image_url = f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference={photo_ref}&key={api_key}"

                places.append({
                    "id": item.get("place_id"),
                    "name": item.get("name"),
                    "latitude": lat_p,
                    "longitude": lng_p,
                    "address": item.get("formatted_address", "Không rõ địa chỉ"),
                    "rating": item.get("rating", 0.0),
                    "review_count": item.get("user_ratings_total", 0),
                    "image_url": image_url,
                    "google_maps_link": google_maps_link,
                    "types": item.get("types", [])
                })
            return {"results": places}
    except Exception as e:
        print(f"[ERROR] Text search thất bại: {e}")
        return {"results": []}
