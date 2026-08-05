# backend/app/service/foods/food_module.py
import json
from typing import List, Dict, Any

def get_main_tags(province: str) -> List[str]:
    """
    Trả về danh mục ẩm thực cho tỉnh được chọn.
    """
    return ["Đặc sản nổi bật", "Ăn sáng ngon", "Món lẩu & nướng", "Ăn vặt đường phố", "Quán cafe đẹp"]


def get_foods_by_province_and_tag(province: str, tag: str) -> List[Dict[str, Any]]:
    """
    Sử dụng Gemini API để sinh danh sách đặc sản kèm quán ăn ngon thực tế tại tỉnh đó.
    """
    # Tránh circular import bằng cách import bên trong hàm
    from app.api.llm_module import generate_itinerary_sync

    prompt = f"""
Hãy đề xuất 4 món ăn đặc sản thuộc thể loại '{tag}' nổi tiếng nhất tại '{province}'.
Yêu cầu trả về kết quả dưới định dạng JSON thô (một mảng các đối tượng), mỗi đối tượng có cấu trúc chính xác như sau:
[
  {{
    "id": "tên_món_ăn_viết_thường_không_dấu_viết_liền_nhau",
    "food": "Tên món ăn bằng tiếng Việt",
    "image_url": null,
    "description": "Mô tả ngắn gọn, hấp dẫn về hương vị đặc trưng của món ăn đó và đề xuất cụ thể 1-2 địa chỉ quán ăn ngon nổi tiếng có thật tại {province} để thực khách thưởng thức."
  }}
]

Lưu ý quan trọng:
- Chỉ trả về chuỗi JSON hợp lệ. Không bao bọc trong khối ```json ... ```. Không thêm bất kỳ lời nói giải thích nào khác ngoài chuỗi JSON này.
- Các quán ăn được đề xuất trong phần description phải là địa chỉ thực tế có thật tại {province}.
"""

    print(f"[AI Food] Querying Gemini for foods in {province} (Tag: {tag})...")
    try:
        response_text = generate_itinerary_sync(prompt, timeout=30.0)
        
        # Làm sạch chuỗi JSON nếu Gemini bao bọc trong markdown block
        clean_text = response_text.strip()
        if clean_text.startswith("```"):
            lines = clean_text.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines[-1].startswith("```"):
                lines = lines[:-1]
            clean_text = "\n".join(lines).strip()

        foods_list = json.loads(clean_text)
        if isinstance(foods_list, list):
            return foods_list
    except Exception as e:
        print(f"[ERROR] Failed to fetch or parse foods from Gemini: {e}")

    # Fallback dữ liệu nếu gọi API lỗi
    return [
        {
            "id": f"{tag.lower()}_1",
            "food": f"Đặc sản {tag} tại {province}",
            "image_url": None,
            "description": f"Món ăn thơm ngon đậm đà đặc trưng vùng miền của {province}. Hãy ghé thăm các quán ăn lớn ở trung tâm thành phố để trải nghiệm hương vị chuẩn nhất."
        }
    ]
