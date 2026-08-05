# backend/app/api/llm_module.py
import os
import asyncio
from dotenv import load_dotenv
import openai
from openai import AsyncOpenAI
from typing import Any, List, Dict

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


async def ask_gemini(user_prompt: str) -> str:
    """
    Hỏi AI bằng mô hình gpt-4o-mini (bất đồng bộ).
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return "ERROR: OpenAI API Key chưa được cấu hình."

    client = AsyncOpenAI(api_key=api_key)
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"ERROR: OpenAI failed: {e}"


async def generate_itinerary_with_gemini(prompt: str) -> str:
    """
    Tạo lịch trình du lịch bằng mô hình gpt-4o-mini (bất đồng bộ).
    """
    return await ask_gemini(prompt)


async def generate_smart_comment(city: str, service_type: str) -> str:
    prompts = {
        "hotel": f"Tạo một câu tóm tắt, khách quan về dịch vụ khách sạn tại {city}. Ngắn gọn, tối đa 1 câu.",
        "food": f"Tạo một câu tóm tắt, khách quan về các lựa chọn ẩm thực nổi bật tại {city}. Ngắn gọn, tối đa 1 câu.",
        "place": f"Tạo một câu tóm tắt, khách quan giới thiệu các địa điểm du lịch tại {city}. Ngắn gọn, tối đa 1 câu.",
    }
    prompt = prompts.get(service_type, f"Tạo một câu tóm tắt cho điểm đến {city}.")
    return await generate_smart_comment_safe(prompt)


async def generate_smart_comment_safe(prompt: str) -> str:
    txt = await generate_itinerary_with_gemini(prompt)
    if txt.startswith("ERROR:") or txt.strip() == "":
        return "Gợi ý du lịch hấp dẫn không thể bỏ lỡ."
    
    sentences = txt.strip().split(".")
    if len(sentences) <= 2:
        return txt.strip()
    return ". ".join(s.strip() for s in sentences[:2]).strip() + "."


def ask_gemini_sync(user_prompt: str, timeout: float = 60.0) -> str:
    """
    Hỏi AI bằng mô hình gpt-4o-mini (đồng bộ).
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return "ERROR: OpenAI API Key chưa được cấu hình."

    client = openai.OpenAI(api_key=api_key)
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            timeout=timeout
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"ERROR: OpenAI failed: {e}"


def generate_itinerary_sync(prompt: str, timeout: float = 120.0) -> str:
    """
    Tạo lịch trình du lịch bằng mô hình gpt-4o-mini (đồng bộ).
    """
    return ask_gemini_sync(prompt, timeout=timeout)