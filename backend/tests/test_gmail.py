from contextlib import contextmanager
from datetime import UTC, datetime

import httpx
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api import routes
from app.db.models import Base
from app.schemas import CreateApplicationRequest, GmailConnectStartRequest
from app.services import gmail


@contextmanager
def build_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session_local = sessionmaker(bind=engine, autoflush=False, autocommit=False, class_=Session)
    Base.metadata.create_all(bind=engine)
    db = testing_session_local()
    try:
        yield db
    finally:
        db.close()


def test_gmail_connect_start_and_callback(monkeypatch) -> None:
    monkeypatch.setenv("AUTH_BASE_URL", "https://auth.dimy.dev")
    monkeypatch.setenv("FRONTEND_BASE_URL", "http://localhost:3000")

    def fake_post(url: str, **kwargs):
        assert url == "https://auth.dimy.dev/oauth/google/start"
        assert kwargs["json"]["app"] == "jobby"
        assert kwargs["json"]["return_url"] == "http://localhost:3000/applications/123"
        return _json_response(
            {
                "auth_url": "https://auth.dimy.dev/google/start?id=abc",
                "flow_id": "flow-123",
            }
        )

    def fake_get(url: str, **kwargs):
        assert url == "https://auth.dimy.dev/status"
        return _json_response(
            {
                "app_id": "personal-auth",
                "google": {
                    "connected": True,
                    "provider": "google",
                    "email": "person@example.com",
                    "display_name": "Person",
                    "scopes": ["openid", "email", "profile", gmail.GMAIL_SCOPE],
                },
            }
        )

    monkeypatch.setattr(gmail.httpx, "post", fake_post)
    monkeypatch.setattr(gmail.httpx, "get", fake_get)

    with build_session() as db:
        started = routes.gmail_connect_start(GmailConnectStartRequest(return_path="/applications/123"), db)
        assert started.auth_url == "https://auth.dimy.dev/google/start?id=abc"

        status = routes.gmail_status(db)
        assert status.connected is True
        assert status.email_address == "person@example.com"


def test_gmail_sync_suggests_matching_threads(monkeypatch) -> None:
    monkeypatch.setenv("AUTH_BASE_URL", "https://auth.dimy.dev")
    monkeypatch.setenv("AUTH_SERVICE_TOKEN", "shared-secret")
    with build_session() as db:
        created = routes.create_application(
            CreateApplicationRequest(
                company_name="OpenAI",
                job_title="AI Engineer",
                status="applied",
                applied_date="2026-03-09",
                location="Remote",
                job_url="https://openai.com/careers/roles/1",
                job_description="Build production AI systems for customers.",
                cv_used="Experienced engineer shipping AI systems in production.",
                notes="",
                cover_letter="",
                interview_questions=[],
            ),
            db,
        )
        def fake_get(url: str, **kwargs):
            if url == "https://auth.dimy.dev/oauth/google/token":
                assert kwargs["headers"]["Authorization"] == "Bearer shared-secret"
                return _json_response(
                    {
                        "access_token": "token",
                        "expiry": datetime.now(UTC).isoformat(),
                        "email": "me@example.com",
                        "scopes": ["openid", "email", "profile", gmail.GMAIL_SCOPE],
                    }
                )
            if url == "https://auth.dimy.dev/status":
                return _json_response(
                    {
                        "app_id": "personal-auth",
                        "google": {
                            "connected": True,
                            "provider": "google",
                            "email": "me@example.com",
                            "display_name": "Me",
                            "scopes": ["openid", "email", "profile", gmail.GMAIL_SCOPE],
                        },
                    }
                )
            if url == gmail.GMAIL_THREADS_URL:
                return _json_response({"threads": [{"id": "thread-1"}]})
            if url == f"{gmail.GMAIL_THREADS_URL}/thread-1":
                return _json_response(
                    {
                        "id": "thread-1",
                        "snippet": "Thanks for applying to the AI Engineer role at OpenAI.",
                        "messages": [
                            {
                                "internalDate": str(int(datetime(2026, 3, 10, 9, 0, tzinfo=UTC).timestamp() * 1000)),
                                "payload": {
                                    "headers": [
                                        {"name": "Subject", "value": "OpenAI AI Engineer application update"},
                                        {"name": "From", "value": "Recruiting <jobs@openai.com>"},
                                        {"name": "To", "value": "me@example.com"},
                                    ]
                                },
                            }
                        ],
                    }
                )
            raise AssertionError(f"Unexpected Gmail GET {url}")

        monkeypatch.setattr(gmail.httpx, "get", fake_get)

        sync_result = routes.gmail_sync(db)
        assert sync_result.threads_synced == 1
        assert sync_result.suggestions_updated == 1

        links = routes.application_email_links(created.id, db)
        assert len(links.suggested) == 1
        assert links.suggested[0].thread_id == "thread-1"
        assert any("OpenAI" in reason for reason in links.suggested[0].match_reasons)

        linked = routes.link_application_email_thread(created.id, "thread-1", db)
        assert len(linked.linked) == 1
        assert linked.linked[0].status == "linked"

        unlinked = routes.unlink_application_email_thread(created.id, "thread-1", db)
        assert unlinked.linked == []


def test_gmail_sync_skips_low_confidence_threads(monkeypatch) -> None:
    monkeypatch.setenv("AUTH_BASE_URL", "https://auth.dimy.dev")
    monkeypatch.setenv("AUTH_SERVICE_TOKEN", "shared-secret")
    with build_session() as db:
        created = routes.create_application(
            CreateApplicationRequest(
                company_name="OpenAI",
                job_title="AI Engineer",
                status="draft",
                applied_date=None,
                location="Remote",
                job_url="https://openai.com/careers/roles/1",
                job_description="Build production AI systems for customers.",
                cv_used="Experienced engineer shipping AI systems in production.",
                notes="",
                cover_letter="",
                interview_questions=[],
            ),
            db,
        )
        def fake_get(url: str, **kwargs):
            if url == "https://auth.dimy.dev/oauth/google/token":
                assert kwargs["headers"]["Authorization"] == "Bearer shared-secret"
                return _json_response(
                    {
                        "access_token": "token",
                        "expiry": datetime.now(UTC).isoformat(),
                        "email": "me@example.com",
                        "scopes": ["openid", "email", "profile", gmail.GMAIL_SCOPE],
                    }
                )
            if url == "https://auth.dimy.dev/status":
                return _json_response(
                    {
                        "app_id": "personal-auth",
                        "google": {
                            "connected": True,
                            "provider": "google",
                            "email": "me@example.com",
                            "display_name": "Me",
                            "scopes": ["openid", "email", "profile", gmail.GMAIL_SCOPE],
                        },
                    }
                )
            if url == gmail.GMAIL_THREADS_URL:
                return _json_response({"threads": [{"id": "thread-2"}]})
            if url == f"{gmail.GMAIL_THREADS_URL}/thread-2":
                return _json_response(
                    {
                        "id": "thread-2",
                        "snippet": "Calendar reminder for rent payment.",
                        "messages": [
                            {
                                "internalDate": str(int(datetime(2026, 3, 10, 9, 0, tzinfo=UTC).timestamp() * 1000)),
                                "payload": {
                                    "headers": [
                                        {"name": "Subject", "value": "Monthly reminder"},
                                        {"name": "From", "value": "Billing <rent@example.com>"},
                                        {"name": "To", "value": "me@example.com"},
                                    ]
                                },
                            }
                        ],
                    }
                )
            raise AssertionError(f"Unexpected Gmail GET {url}")

        monkeypatch.setattr(gmail.httpx, "get", fake_get)

        sync_result = routes.gmail_sync(db)
        assert sync_result.threads_synced == 1

        links = routes.application_email_links(created.id, db)
        assert links.suggested == []
        assert links.linked == []


def _json_response(payload):
    return httpx.Response(200, json=payload)
