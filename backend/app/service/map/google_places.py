# backend/app/service/map/google_places.py
import os
import json
import httpx
from dotenv import load_dotenv

# Nap file .env ngay khi import module
load_dotenv()


async def call_openai_places_fallback(prompt: str) -> dict:
    """
    Ham du phong goi OpenAI de tao du lieu dia diem gia lap thuc te neu Google Cloud API bi chan.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("[ERROR] OpenAI API Key chua duoc cau hinh. Khong the dung AI du phong.")
        return {"results": []}

    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=api_key)
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a precise JSON generator for tourism data."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )
        content = response.choices[0].message.content.strip()

        # Lam sach markdown json neu co
        if content.startswith("```"):
            lines = content.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines[-1].startswith("```"):
                lines = lines[:-1]
            content = "\n".join(lines).strip()

        data = json.loads(content)
        # Bo sung google_maps_link mac dinh neu thieu
        for p in data.get("results", []):
            if not p.get("google_maps_link") and p.get("latitude") and p.get("longitude"):
                p["google_maps_link"] = f"https://www.google.com/maps?q={p['latitude']},{p['longitude']}"
        return data
    except Exception as e:
        print(f"[ERROR] Loi khi tao du lieu du phong tu OpenAI: {e}")
        return {"results": []}


async def get_nearby_places_openai_fallback(lat: float, lng: float, radius: int, place_type: str) -> dict:
    prompt = f"""
    Bạn là một trợ lý bản đồ du lịch. Hãy gợi ý 6 địa điểm dịch vụ hoặc điểm ăn uống thực tế có thật tại khu vực gần tọa độ {lat}, {lng} ở Việt Nam, phù hợp với loại hình "{place_type}" (ví dụ: restaurant là nhà hàng, cafe là quán cà phê, lodging là khách sạn).
    Tất cả các địa điểm phải thực sự tồn tại ở vùng lân cận tọa độ này. Tọa độ (latitude, longitude) phải được tính toán chính xác để nằm cách tọa độ gốc tối đa {radius} mét.
    Yêu cầu trả về DUY NHẤT một chuỗi JSON hợp lệ theo định dạng sau, không kèm bất kỳ giải thích nào:
    {{
      "results": [
        {{
          "id": "id_ngau_nhien_1",
          "name": "Tên địa điểm thực tế",
          "latitude": vĩ_độ_số_thực,
          "longitude": kinh_độ_số_thực,
          "address": "Địa chỉ chi tiết tại Việt Nam",
          "rating": số_thực_đánh_giá_từ_3.8_đến_5.0,
          "review_count": số_lượng_đánh_giá_số_nguyên,
          "google_maps_link": "link_google_maps_tim_kiem_dia_diem"
        }}
      ]
    }}
    """
    return await call_openai_places_fallback(prompt)


async def get_text_places_openai_fallback(query: str) -> dict:
    prompt = f"""
    Bạn là một hướng dẫn viên du lịch chuyên nghiệp. Hãy tìm kiếm và gợi ý 6 địa điểm tham quan du lịch nổi tiếng thực tế tại Việt Nam phù hợp nhất với truy vấn: "{query}".
    Mỗi địa điểm phải có tọa độ địa lý (latitude, longitude) chính xác của địa danh đó.
    Yêu cầu trả về DUY NHẤT một chuỗi JSON hợp lệ theo định dạng sau, không kèm bất kỳ giải thích nào:
    {{
      "results": [
        {{
          "id": "id_ngau_nhien_1",
          "name": "Tên địa danh thực tế (Ví dụ: Cột cờ Lũng Cú)",
          "latitude": vĩ_độ_thực_số_thực,
          "longitude": kinh_độ_thực_số_thực,
          "address": "Địa chỉ chi tiết (huyện, tỉnh thành)",
          "rating": số_thực_đánh_giá_từ_4.0_đến_5.0,
          "review_count": số_nguyên_luot_đánh_giá,
          "google_maps_link": "link_google_maps_thong_tin_dia_diem"
        }}
      ]
    }}
    """
    return await call_openai_places_fallback(prompt)


async def search_nearby_places(lat: float, lng: float, radius: int = 1000, place_type: str = "restaurant"):
    """
    Tim kiem dia diem xung quanh bang Google Places API. Neu loi/chua bat thanh toan, chuyen sang AI du phong.
    """
    api_key = os.getenv("GOOGLE_PLACES_API_KEY")
    if not api_key or api_key == "YOUR_GOOGLE_PLACES_API_KEY_HERE":
        print("[WARN] Google Places API Key chua bat. Chuyen sang AI du phong...")
        return await get_nearby_places_openai_fallback(lat, lng, radius, place_type)

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
            response.raise_for_status()
            data = response.json()

            status = data.get("status")
            if status != "OK" and status != "ZERO_RESULTS":
                print(f"[WARN] Google Places Nearby Search status: {status}. Message: {data.get('error_message')}. Chuyen sang dung OpenAI du phong...")
                return await get_nearby_places_openai_fallback(lat, lng, radius, place_type)

            raw_results = data.get("results", [])
            places = []
            for item in raw_results:
                lat_p = item.get("geometry", {}).get("location", {}).get("lat")
                lng_p = item.get("geometry", {}).get("location", {}).get("lng")
                google_maps_link = f"https://www.google.com/maps?q={lat_p},{lng_p}" if lat_p and lng_p else ""

                # Lay link anh tu photo reference
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
                    "address": item.get("vicinity", "Khong ro dia chi"),
                    "rating": item.get("rating", 0.0),
                    "review_count": item.get("user_ratings_total", 0),
                    "image_url": image_url,
                    "google_maps_link": google_maps_link,
                    "price_level": item.get("price_level", None)
                })
            return {"results": places}
    except Exception as e:
        print(f"[ERROR] Google Places Nearby Search that bai: {e}. Chuyen sang AI du phong...")
        return await get_nearby_places_openai_fallback(lat, lng, radius, place_type)


async def geocode_address(address: str):
    """
    Chuyen dia chi bang chu sang toa do (Geocoding API).
    """
    api_key = os.getenv("GOOGLE_PLACES_API_KEY")
    if not api_key or api_key == "YOUR_GOOGLE_PLACES_API_KEY_HERE":
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
        print(f"[ERROR] Geocoding that bai: {e}")
    return None


async def search_text_places(query: str):
    """
    Tim kiem dia diem bang chu (Text Search API). Neu loi/chua bat thanh toan, chuyen sang AI du phong.
    """
    api_key = os.getenv("GOOGLE_PLACES_API_KEY")
    if not api_key or api_key == "YOUR_GOOGLE_PLACES_API_KEY_HERE":
        print("[WARN] Google Places API Key chua bat. Chuyen sang AI du phong...")
        return await get_text_places_openai_fallback(query)

    url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    params = {
        "query": query,
        "key": api_key,
        "language": "vi"
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

            status = data.get("status")
            if status != "OK" and status != "ZERO_RESULTS":
                print(f"[WARN] Google Places Text Search status: {status}. Message: {data.get('error_message')}. Chuyen sang dung OpenAI du phong...")
                return await get_text_places_openai_fallback(query)

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
                    "address": item.get("formatted_address", "Khong ro dia chi"),
                    "rating": item.get("rating", 0.0),
                    "review_count": item.get("user_ratings_total", 0),
                    "image_url": image_url,
                    "google_maps_link": google_maps_link,
                    "types": item.get("types", [])
                })
            return {"results": places}
    except Exception as e:
        print(f"[ERROR] Google Places Text Search that bai: {e}. Chuyen sang AI du phong...")
        return await get_text_places_openai_fallback(query)
