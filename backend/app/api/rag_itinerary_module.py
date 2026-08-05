# backend/app/api/rag_itinerary_module.py

from typing import List, Dict, Any

def generate_static_fallback_itinerary(places, days, province):
    selected = places[: days * 3]
    itinerary_lines = []

    for d in range(1, days + 1):
        itinerary_lines.append(f"### Ngày {d}: Khám phá {province}")
        idx = (d - 1) * 3

        if idx < len(selected):
            p = selected[idx]
            itinerary_lines.append(f"*   **Sáng**: Tham quan **{p['name']}** (Địa chỉ: {p['address']}).")
            itinerary_lines.append(f"    *   *Ăn trưa*: Gợi ý thưởng thức đặc sản ẩm thực gần khu vực {p['name']}.")

        if idx + 1 < len(selected):
            p = selected[idx + 1]
            itinerary_lines.append(f"*   **Chiều**: Khám phá địa điểm nổi tiếng **{p['name']}**.")
            
        if idx + 2 < len(selected):
            p = selected[idx + 2]
            itinerary_lines.append(f"*   **Tối**: Dạo chơi khu vực **{p['name']}** và thư giãn.")
            itinerary_lines.append(f"    *   *Ăn tối*: Trải nghiệm các quán ăn/nhà hàng ngon gần đó.")

        itinerary_lines.append("")

    return "\n".join(itinerary_lines)


def generate_itinerary_rag(
    province: str,
    days: int,
    preferences: Dict,
    places: List[Dict[str, Any]]
):
    """
    Sinh lịch trình du lịch thông minh bằng cách gửi danh sách điểm du lịch thực tế
    và tùy chọn của người dùng sang Gemini API để viết lịch trình chi tiết.
    """
    # Xây dựng danh sách địa điểm thực tế
    places_str = ""
    for idx, p in enumerate(places[:days*4]):
        places_str += f"- {p['name']}: {p.get('description', '')} (Địa chỉ: {p.get('address', '')})\n"

    prompt = f"""
Hãy đóng vai trò là một chuyên gia lập kế hoạch du lịch chuyên nghiệp tại Việt Nam.
Nhiệm vụ của bạn là thiết kế một lịch trình du lịch chi tiết {days} ngày tại {province} bằng tiếng Việt.

Dưới đây là danh sách các địa điểm tham quan thực tế (lấy từ Google Maps) tại khu vực này để bạn sắp xếp vào lịch trình:
{places_str}

Sở thích và yêu cầu của khách hàng:
- Loại hình yêu thích: {preferences.get('interests', [])}
- Nhịp độ chuyến đi: {preferences.get('pace', 'Vừa phải')}
- Đối tượng đi cùng: {preferences.get('group_type', 'Gia đình')}
- Các điểm/loại hình cần tránh: {preferences.get('avoid_categories', [])}

Yêu cầu chi tiết về lịch trình:
1. Phân chia rõ ràng từng ngày: Sáng, Trưa, Chiều, Tối.
2. Sắp xếp lộ trình khoa học: Các địa điểm tham quan trong cùng một ngày phải gần nhau về mặt địa lý để tiện di chuyển.
3. Ăn uống: Gợi ý cụ thể tên các món ăn đặc sản vùng miền nổi tiếng và đề xuất 1-2 nhà hàng, quán ăn, quán cafe ngon có thật ở gần khu vực điểm du lịch của buổi trưa/buổi tối ngày hôm đó.
4. Trình bày dưới định dạng Markdown chuyên nghiệp, hấp dẫn, dễ đọc (sử dụng các thẻ tiêu đề như '### Ngày 1:', '### Ngày 2:', gạch đầu dòng, chữ in đậm).
5. Không thêm lời chào, lời mở đầu hoặc kết luận dài dòng. Đi thẳng vào lịch trình.
"""

    itinerary_text = ""
    try:
        from app.api.llm_module import generate_itinerary_sync
        print(f"[AI] Generating {days}-day itinerary for {province} using Gemini...")
        itinerary_text = generate_itinerary_sync(prompt)

        # Kiểm tra nếu kết quả trả về bị lỗi
        if "ERROR:" in itinerary_text or "GEN_ERROR:" in itinerary_text or "WriterModel_Not_Initialized" in itinerary_text:
            print(f"[WARN] Gemini failed to generate itinerary, falling back to static generation. Reason: {itinerary_text}")
            itinerary_text = generate_static_fallback_itinerary(places, days, province)
    except Exception as e:
        print(f"[ERROR] Exception calling Gemini: {e}")
        itinerary_text = generate_static_fallback_itinerary(places, days, province)

    return {
        "province": province,
        "days": days,
        "itinerary": itinerary_text,
        "rag_contexts_used": []  # Đã gỡ bỏ RAG tĩnh
    }