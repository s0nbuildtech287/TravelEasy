# backend/app/api/rag_itinerary_module.py

from typing import List, Dict, Any
from app.rag_module.rag_pipeline import RAGPipeline
from app.service.tourism.tourism_module import TOURISM_PLACES
import threading

_PIPELINE = {"instance": None, "lock": threading.Lock()}


def get_pipeline():
    if _PIPELINE["instance"] is None:
        with _PIPELINE["lock"]:
            _PIPELINE["instance"] = RAGPipeline(
                engine=None,
                persist_path="app/rag_store"
            )
            if not _PIPELINE["instance"].is_built:
                records = []
                for p in TOURISM_PLACES:
                    records.append({
                        "id": f"tourism_places:{p['id']}",
                        "record": p
                    })
                _PIPELINE["instance"].build_from_records(records)
    return _PIPELINE["instance"]


def generate_static_fallback_itinerary(places, days):
    selected = places[: days * 4]
    itinerary_lines = []

    for d in range(1, days + 1):
        itinerary_lines.append(f"Ngày {d}:")
        idx = (d - 1) * 4

        if idx < len(selected):
            p = selected[idx]
            itinerary_lines.append(f"- Sáng: Tham quan {p['name']}. Hoạt động: {', '.join(p.get('activities', []))}.")
            itinerary_lines.append(f"  Ghi chú: {p.get('weather_notes', 'Nên đi giày thể thao')}.")

        if idx + 1 < len(selected):
            p = selected[idx + 1]
            itinerary_lines.append(f"- Chiều: Khám phá {p['name']}. Nổi bật: {', '.join(p.get('highlights', []))}.")

        if idx + 2 < len(selected):
            p = selected[idx + 2]
            itinerary_lines.append(f"- Tối: Dạo chơi {p['name']}. Thời gian gợi ý: {p.get('duration_recommend', '1-2 giờ')}.")
            itinerary_lines.append(f"  Gợi ý ăn uống: Thưởng thức đặc sản vùng gần {p['name']}.")

        itinerary_lines.append("")

    return "\n".join(itinerary_lines)


def generate_itinerary_rag(
    province: str,
    days: int,
    preferences: Dict,
    places: List[Dict[str, Any]]
):

    pipeline = get_pipeline()

    query = f"""
    Tạo lịch trình du lịch {days} ngày tại {province}.
    Ưu tiên loại hình: {preferences.get('interests')}.
    Nhịp độ: {preferences.get('pace')}.
    Nhóm khách: {preferences.get('group_type')}.
    Tránh: {preferences.get('avoid_categories')}.
    """

    # Tìm kiếm các tài liệu RAG liên quan
    contexts = pipeline.search(query=query, top_k=10)

    # Lập Prompt gửi sang Gemini để tạo lịch trình sinh động
    places_str = ""
    for p in places[: days * 4]:
        places_str += f"- {p['name']}: {p.get('description', '')} (Địa chỉ: {p.get('address', '')})\n"

    context_str = ""
    for idx, ctx in enumerate(contexts):
        context_str += f"Tài liệu {idx+1}: {ctx['text']}\n"

    prompt = f"""
Hãy đóng vai trò là một hướng dẫn viên du lịch chuyên nghiệp tại Việt Nam.
Nhiệm vụ của bạn là lập kế hoạch du lịch chi tiết {days} ngày tại {province} dựa trên các thông tin sau:

1. Danh sách địa điểm tham quan được chọn:
{places_str}

2. Ngữ cảnh du lịch bổ sung (RAG Context):
{context_str}

3. Sở thích và yêu cầu của du khách:
- Loại hình yêu thích: {preferences.get('interests', [])}
- Nhịp độ chuyến đi: {preferences.get('pace', 'Vừa phải')}
- Đối tượng đi cùng: {preferences.get('group_type', 'Gia đình')}
- Các loại hình cần tránh: {preferences.get('avoid_categories', [])}

Yêu cầu về lịch trình:
- Phân chia cụ thể từng ngày thành các buổi: Sáng, Trưa, Chiều, Tối.
- Tại mỗi điểm tham quan, mô tả hoạt động chính và thời gian gợi ý.
- Đặc biệt quan trọng: Hãy đề xuất cụ thể tên một vài quán ăn ngon, quán cafe nổi tiếng (hoặc đặc sản cụ thể có địa điểm ăn gợi ý) thực tế ở gần khu vực địa điểm du lịch đó để du khách dừng chân nghỉ ngơi/ăn uống cho buổi Trưa và buổi Tối.
- Sắp xếp lộ trình di chuyển khoa học, các điểm trong cùng một ngày nên gần nhau về mặt địa lý để tối ưu di chuyển.

Định dạng đầu ra:
Trả về lịch trình rõ ràng bằng tiếng Việt dưới định dạng Markdown, viết chi tiết và hấp dẫn. Sử dụng các thẻ tiêu đề như 'Ngày 1:', 'Ngày 2:'. Không thêm lời chào hay giải thích bên lề.
"""

    itinerary_text = ""
    try:
        from app.api.llm_module import generate_itinerary_sync
        print("[AI] Sending prompt to Gemini for itinerary generation...")
        itinerary_text = generate_itinerary_sync(prompt)

        # Nếu lỗi API hoặc key không hợp lệ, dùng fallback tĩnh
        if "ERROR:" in itinerary_text or "GEN_ERROR:" in itinerary_text or "WriterModel_Not_Initialized" in itinerary_text:
            print(f"[WARN] Gemini failed to generate, using static fallback. Reason: {itinerary_text}")
            itinerary_text = generate_static_fallback_itinerary(places, days)
    except Exception as e:
        print(f"[ERROR] Failed to call Gemini, using static fallback: {e}")
        itinerary_text = generate_static_fallback_itinerary(places, days)

    return {
        "province": province,
        "days": days,
        "itinerary": itinerary_text,
        "rag_contexts_used": contexts
    }