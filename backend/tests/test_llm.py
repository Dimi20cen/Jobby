import httpx
import pytest

from app.services import llm


def test_generate_application_calls_hermes(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("HERMES_BASE_URL", "http://localhost:8010")
    monkeypatch.setenv("HERMES_SERVICE_TOKEN", "test-token")
    monkeypatch.setenv("HERMES_PROVIDER", "codex_cli")
    monkeypatch.setenv("HERMES_MODEL", "custom-model")

    def fake_post(url: str, **kwargs: object) -> httpx.Response:
        assert url == "http://localhost:8010/v1/structured"
        assert kwargs["headers"]["Authorization"] == "Bearer test-token"
        assert kwargs["json"]["provider"] == "codex_cli"
        assert kwargs["json"]["model"] == "custom-model"
        return httpx.Response(
            200,
            json={
                "provider": "codex_cli",
                "used_model": "codex-cli",
                "data": {
                    "cover_letter": "This tailored cover letter is comfortably long enough.",
                    "interview_questions": ["How do you measure impact?"],
                    "relevance_score": 88,
                    "jd_coverage": ["LLM systems"],
                    "risk_flags": ["Needs more quantified outcomes"],
                    "used_model": "codex-cli",
                },
            },
        )

    monkeypatch.setattr(llm.httpx, "post", fake_post)

    result = llm.generate_application("A" * 40, "B" * 40)
    assert result == (
        "This tailored cover letter is comfortably long enough.",
        ["How do you measure impact?"],
        88,
        ["LLM systems"],
        ["Needs more quantified outcomes"],
        "codex-cli",
    )


def test_generate_application_requires_hermes_config(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("HERMES_BASE_URL", raising=False)
    monkeypatch.delenv("HERMES_SERVICE_TOKEN", raising=False)

    with pytest.raises(llm.LLMServiceError) as exc:
        llm.generate_application("A" * 40, "B" * 40)

    assert "HERMES_BASE_URL" in str(exc.value)


def test_generate_application_surfaces_hermes_error(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("HERMES_BASE_URL", "http://localhost:8010")
    monkeypatch.setenv("HERMES_SERVICE_TOKEN", "test-token")

    def fake_post(url: str, **kwargs: object) -> httpx.Response:
        return httpx.Response(502, json={"detail": "gateway unavailable"})

    monkeypatch.setattr(llm.httpx, "post", fake_post)

    with pytest.raises(llm.LLMServiceError) as exc:
        llm.generate_application("A" * 40, "B" * 40)

    assert "gateway unavailable" in str(exc.value)
