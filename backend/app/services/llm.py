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


def _model_chain() -> list[str]:
    primary = os.getenv("OPENAI_MODEL", "openai/gpt-4o-mini").strip()
    fallbacks_raw = os.getenv("FALLBACK_MODELS", "")
    fallbacks = [m.strip() for m in fallbacks_raw.split(",") if m.strip()]
    deduped = []
    for model in [primary, *fallbacks]:
        if model and model not in deduped:
            deduped.append(model)
    return deduped


def generate_application(
    job_description: str, cv_text: str
) -> tuple[list[str], str, list[str], int, list[str], list[str], str]:
    api_key = (
        os.getenv("OPENROUTER_API_KEY")
        or os.getenv("OPENAI_API_KEY")
        or os.getenv("GEMINI_API_KEY")
    )
    if not api_key:
        raise LLMServiceError(
            "OPENROUTER_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY is not configured"
        )

    base_url = os.getenv("OPENAI_BASE_URL", "https://openrouter.ai/api/v1")
    client = OpenAI(api_key=api_key, base_url=base_url)

    models = _model_chain()
    user_prompt = USER_PROMPT_TEMPLATE.format(job_description=job_description, cv_text=cv_text)

    request_kwargs: dict[str, Any] = {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.2,
    }
    # OpenRouter-specific ranking headers should only be sent to OpenRouter.
    if "openrouter.ai" in base_url:
        request_kwargs["extra_headers"] = {
            "HTTP-Referer": os.getenv("OPENROUTER_SITE_URL", "http://localhost:3000"),
            "X-Title": os.getenv("OPENROUTER_APP_NAME", "jobby"),
        }

    response = None
    used_model = models[0]
    last_error = None
    for model in models:
        used_model = model
        try:
            # Preferred: ask provider for strict JSON mode when supported.
            response = client.chat.completions.create(
                **request_kwargs,
                model=model,
                response_format={"type": "json_object"},
            )
            break
        except Exception:
            # Fallback for OpenAI-compatible providers that don't support json_object.
            try:
                response = client.chat.completions.create(**request_kwargs, model=model)
                break
            except Exception as retry_exc:
                last_error = retry_exc

    if response is None:
        raise LLMServiceError(f"LLM provider call failed after trying {models}: {last_error}")

    content = (response.choices[0].message.content or "").strip()
    data = _extract_json(content)

    bullets = data.get("tailored_bullets")
    cover = data.get("cover_letter")
    interview_questions = data.get("interview_questions")
    relevance_score = data.get("relevance_score")
    jd_coverage = data.get("jd_coverage")
    risk_flags = data.get("risk_flags")
    if isinstance(data.get("evaluation"), dict):
        evaluation = data["evaluation"]
        relevance_score = evaluation.get("relevance_score", relevance_score)
        jd_coverage = evaluation.get("jd_coverage", jd_coverage)
        risk_flags = evaluation.get("risk_flags", risk_flags)

    if not isinstance(bullets, list) or not bullets or not all(isinstance(b, str) for b in bullets):
        raise LLMServiceError("LLM output missing tailored_bullets")
    if not isinstance(cover, str) or len(cover.strip()) < 30:
        raise LLMServiceError("LLM output missing cover_letter")
    if not isinstance(interview_questions, list) or not interview_questions:
        raise LLMServiceError("LLM output missing interview_questions")
    if not isinstance(relevance_score, int):
        raise LLMServiceError("LLM output missing relevance_score")
    if not isinstance(jd_coverage, list):
        raise LLMServiceError("LLM output missing jd_coverage")
    if not isinstance(risk_flags, list):
        raise LLMServiceError("LLM output missing risk_flags")

    return (
        bullets[:8],
        cover.strip(),
        [q for q in interview_questions if isinstance(q, str)][:10],
        max(0, min(100, relevance_score)),
        [x for x in jd_coverage if isinstance(x, str)][:8],
        [x for x in risk_flags if isinstance(x, str)][:8],
        used_model,
    )
