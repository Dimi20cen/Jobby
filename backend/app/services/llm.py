import json
import os
from typing import Any

from openai import OpenAI

from app.prompts import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE


class LLMServiceError(Exception):
    pass


def _extract_json(content: str) -> dict[str, Any]:
    content = content.strip()
    if content.startswith("```"):
        content = content.strip("`")
        content = content.replace("json", "", 1).strip()
    try:
        data = json.loads(content)
    except json.JSONDecodeError as exc:
        raise LLMServiceError("LLM response was not valid JSON") from exc
    return data


def generate_application(job_description: str, cv_text: str) -> tuple[list[str], str]:
    api_key = os.getenv("OPENROUTER_API_KEY") or os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise LLMServiceError("OPENROUTER_API_KEY or OPENAI_API_KEY is not configured")

    client = OpenAI(
        api_key=api_key,
        base_url=os.getenv("OPENAI_BASE_URL", "https://openrouter.ai/api/v1"),
    )

    model = os.getenv("OPENAI_MODEL", "openai/gpt-4o-mini")
    user_prompt = USER_PROMPT_TEMPLATE.format(job_description=job_description, cv_text=cv_text)

    extra_headers = {
        "HTTP-Referer": os.getenv("OPENROUTER_SITE_URL", "http://localhost:3000"),
        "X-Title": os.getenv("OPENROUTER_APP_NAME", "ai-jobber"),
    }

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
            extra_headers=extra_headers,
            response_format={"type": "json_object"},
        )
    except Exception as exc:
        raise LLMServiceError("LLM provider call failed") from exc

    content = (response.choices[0].message.content or "").strip()
    data = _extract_json(content)

    bullets = data.get("tailored_bullets")
    cover = data.get("cover_letter")
    if not isinstance(bullets, list) or not bullets or not all(isinstance(b, str) for b in bullets):
        raise LLMServiceError("LLM output missing tailored_bullets")
    if not isinstance(cover, str) or len(cover.strip()) < 30:
        raise LLMServiceError("LLM output missing cover_letter")

    return bullets[:8], cover.strip()
