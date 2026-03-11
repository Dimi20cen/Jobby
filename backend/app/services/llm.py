import json
import os
from typing import Any

import httpx

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
        raise LLMServiceError("Hermes response was not valid JSON") from exc
    return data


def _normalize_generation_payload(data: dict[str, Any]) -> tuple[str, list[str], int, list[str], list[str], str]:
    cover = data.get("cover_letter")
    interview_questions = data.get("interview_questions")
    relevance_score = data.get("relevance_score")
    jd_coverage = data.get("jd_coverage")
    risk_flags = data.get("risk_flags")
    used_model = data.get("used_model")
    if isinstance(data.get("evaluation"), dict):
        evaluation = data["evaluation"]
        relevance_score = evaluation.get("relevance_score", relevance_score)
        jd_coverage = evaluation.get("jd_coverage", jd_coverage)
        risk_flags = evaluation.get("risk_flags", risk_flags)
    if not isinstance(used_model, str) or not used_model.strip():
        used_model = "unknown"

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
        cover.strip(),
        [q for q in interview_questions if isinstance(q, str)][:10],
        max(0, min(100, relevance_score)),
        [x for x in jd_coverage if isinstance(x, str)][:8],
        [x for x in risk_flags if isinstance(x, str)][:8],
        used_model.strip(),
    )


def _hermes_schema() -> dict[str, Any]:
    return {
        "type": "object",
        "additionalProperties": False,
        "required": [
            "cover_letter",
            "interview_questions",
            "relevance_score",
            "jd_coverage",
            "risk_flags",
            "used_model",
        ],
        "properties": {
            "cover_letter": {"type": "string"},
            "interview_questions": {"type": "array", "items": {"type": "string"}},
            "relevance_score": {"type": "integer"},
            "jd_coverage": {"type": "array", "items": {"type": "string"}},
            "risk_flags": {"type": "array", "items": {"type": "string"}},
            "used_model": {"type": "string"},
        },
    }


def _hermes_messages(job_description: str, cv_text: str) -> list[dict[str, str]]:
    user_prompt = USER_PROMPT_TEMPLATE.format(job_description=job_description, cv_text=cv_text)
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]


def generate_application(
    job_description: str, cv_text: str
) -> tuple[str, list[str], int, list[str], list[str], str]:
    hermes_base_url = os.getenv("HERMES_BASE_URL", "").strip()
    hermes_service_token = os.getenv("HERMES_SERVICE_TOKEN", "").strip()
    hermes_provider = os.getenv("HERMES_PROVIDER", "").strip() or None
    hermes_model = os.getenv("HERMES_MODEL", "").strip() or None
    hermes_timeout_seconds = float(os.getenv("HERMES_TIMEOUT_SECONDS", "180"))

    if not hermes_base_url:
        raise LLMServiceError("HERMES_BASE_URL is not configured")
    if not hermes_service_token:
        raise LLMServiceError("HERMES_SERVICE_TOKEN is not configured")

    payload: dict[str, Any] = {
        "messages": _hermes_messages(job_description=job_description, cv_text=cv_text),
        "schema": _hermes_schema(),
    }
    if hermes_provider:
        payload["provider"] = hermes_provider
    if hermes_model:
        payload["model"] = hermes_model

    try:
        response = httpx.post(
            f"{hermes_base_url.rstrip('/')}/v1/structured",
            headers={
                "Authorization": f"Bearer {hermes_service_token}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=hermes_timeout_seconds,
        )
    except httpx.HTTPError as exc:
        raise LLMServiceError(f"Hermes request failed: {exc}") from exc

    try:
        data = response.json()
    except ValueError as exc:
        raise LLMServiceError("Hermes response was not valid JSON") from exc

    if response.status_code >= 400:
        detail = data.get("detail") if isinstance(data, dict) else None
        raise LLMServiceError(str(detail or f"Hermes request failed with status {response.status_code}"))

    if not isinstance(data, dict):
        raise LLMServiceError("Hermes response was not an object")

    structured_data = data.get("data")
    if not isinstance(structured_data, dict):
        raise LLMServiceError("Hermes response missing structured data")

    if "used_model" not in structured_data and isinstance(data.get("used_model"), str):
        structured_data["used_model"] = data["used_model"]

    return _normalize_generation_payload(structured_data)
