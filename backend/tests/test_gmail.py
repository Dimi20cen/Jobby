from contextlib import contextmanager
from datetime import UTC, datetime

import httpx
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api import routes
from app.db.models import Base, EmailThread, GmailSyncJob
from app.db.session import get_db
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
    monkeypatch.setenv("AUTH_PUBLIC_BASE_URL", "https://auth.dimy.dev")
    monkeypatch.setenv("AUTH_INTERNAL_BASE_URL", "http://100.124.230.107:8100")
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
        assert url == "http://100.124.230.107:8100/status"
        return _json_response(
            {
                "app_id": "janus",
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


def test_gmail_sync_route_returns_existing_active_job(monkeypatch) -> None:
    launched: list[str] = []

    def fake_launch(job_id) -> None:
        launched.append(str(job_id))

    monkeypatch.setattr(gmail, "launch_sync_job", fake_launch)

    with build_session() as db:
        first = routes.gmail_sync(db)
        second = routes.gmail_sync(db)

        assert first.id == second.id
        assert first.status == "queued"
        assert second.status == "queued"
        assert launched == [str(first.id)]


def test_gmail_sync_active_returns_running_job(monkeypatch) -> None:
    launched: list[str] = []

    def fake_launch(job_id) -> None:
        launched.append(str(job_id))

    monkeypatch.setattr(gmail, "launch_sync_job", fake_launch)

    with build_session() as db:
        created = routes.gmail_sync(db)
        job = db.get(GmailSyncJob, created.id)
        assert job is not None
        job.status = "running"
        db.add(job)
        db.commit()

        active = routes.gmail_sync_active(db)
        assert active is not None
        assert active.id == created.id
        assert active.status == "running"


def test_gmail_sync_active_http_route_is_not_shadowed_by_job_id() -> None:
    app = FastAPI()
    app.include_router(routes.router)

    with build_session() as db:
        job = GmailSyncJob(status="running")
        db.add(job)
        db.commit()
        db.refresh(job)

        def override_get_db():
            try:
                yield db
            finally:
                pass

        app.dependency_overrides[get_db] = override_get_db
        client = TestClient(app)
        response = client.get("/integrations/gmail/sync/active")

        assert response.status_code == 200
        assert response.json()["id"] == str(job.id)
        assert response.json()["status"] == "running"


def test_gmail_sync_suggests_matching_threads(monkeypatch) -> None:
    monkeypatch.setenv("AUTH_PUBLIC_BASE_URL", "https://auth.dimy.dev")
    monkeypatch.setenv("AUTH_INTERNAL_BASE_URL", "http://100.124.230.107:8100")
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
            if url == "http://100.124.230.107:8100/oauth/google/token":
                assert kwargs["headers"]["Authorization"] == "Bearer shared-secret"
                return _json_response(
                    {
                        "access_token": "token",
                        "expiry": datetime.now(UTC).isoformat(),
                        "email": "me@example.com",
                        "scopes": ["openid", "email", "profile", gmail.GMAIL_SCOPE],
                    }
                )
            if url == "http://100.124.230.107:8100/status":
                return _json_response(
                    {
                        "app_id": "janus",
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

        sync_result = gmail.sync_threads(db)
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
    monkeypatch.setenv("AUTH_PUBLIC_BASE_URL", "https://auth.dimy.dev")
    monkeypatch.setenv("AUTH_INTERNAL_BASE_URL", "http://100.124.230.107:8100")
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
            if url == "http://100.124.230.107:8100/oauth/google/token":
                assert kwargs["headers"]["Authorization"] == "Bearer shared-secret"
                return _json_response(
                    {
                        "access_token": "token",
                        "expiry": datetime.now(UTC).isoformat(),
                        "email": "me@example.com",
                        "scopes": ["openid", "email", "profile", gmail.GMAIL_SCOPE],
                    }
                )
            if url == "http://100.124.230.107:8100/status":
                return _json_response(
                    {
                        "app_id": "janus",
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

        sync_result = gmail.sync_threads(db)
        assert sync_result.threads_synced == 1

        links = routes.application_email_links(created.id, db)
        assert links.suggested == []
        assert links.linked == []


def test_gmail_sync_searches_per_application_when_recent_threads_miss(monkeypatch) -> None:
    monkeypatch.setenv("AUTH_PUBLIC_BASE_URL", "https://auth.dimy.dev")
    monkeypatch.setenv("AUTH_INTERNAL_BASE_URL", "http://100.124.230.107:8100")
    monkeypatch.setenv("AUTH_SERVICE_TOKEN", "shared-secret")
    monkeypatch.setenv("GMAIL_SYNC_RECENT_THREADS", "5")
    monkeypatch.setenv("GMAIL_SYNC_SEARCH_PER_APPLICATION", "5")
    with build_session() as db:
        created = routes.create_application(
            CreateApplicationRequest(
                company_name="Bending Spoons",
                job_title="Bending Spoons",
                status="applied",
                applied_date="2026-03-12",
                location="Zurich",
                job_url="https://bendingspoons.com/careers/example",
                job_description="Interesting product engineering work.",
                cv_used="Experienced software engineer shipping product improvements.",
                notes="",
                cover_letter="",
                interview_questions=[],
            ),
            db,
        )

        def fake_get(url: str, **kwargs):
            if url == "http://100.124.230.107:8100/oauth/google/token":
                return _json_response(
                    {
                        "access_token": "token",
                        "expiry": datetime.now(UTC).isoformat(),
                        "email": "me@example.com",
                        "scopes": ["openid", "email", "profile", gmail.GMAIL_SCOPE],
                    }
                )
            if url == "http://100.124.230.107:8100/status":
                return _json_response(
                    {
                        "app_id": "janus",
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
                if "q" not in kwargs["params"]:
                    return _json_response({"threads": []})
                assert "Bending Spoons" in kwargs["params"]["q"]
                return _json_response({"threads": [{"id": "thread-bending"}]})
            if url == f"{gmail.GMAIL_THREADS_URL}/thread-bending":
                return _json_response(
                    {
                        "id": "thread-bending",
                        "snippet": "We reviewed your application and wanted to follow up.",
                        "messages": [
                            {
                                "internalDate": str(int(datetime(2026, 3, 10, 21, 10, tzinfo=UTC).timestamp() * 1000)),
                                "payload": {
                                    "headers": [
                                        {
                                            "name": "Subject",
                                            "value": "Dimitrios Mylonas & Bending Spoons- Regarding your application",
                                        },
                                        {"name": "From", "value": "Bending Spoons <no-reply@bendingspoons.com>"},
                                        {"name": "To", "value": "me@example.com"},
                                    ]
                                },
                            }
                        ],
                    }
                )
            raise AssertionError(f"Unexpected Gmail GET {url}")

        monkeypatch.setattr(gmail.httpx, "get", fake_get)

        sync_result = gmail.sync_threads(db)
        assert sync_result.threads_synced == 1
        assert sync_result.suggestions_updated == 1

        links = routes.application_email_links(created.id, db)
        assert len(links.suggested) == 1
        assert links.suggested[0].thread_id == "thread-bending"
        assert any("Bending Spoons" in reason for reason in links.suggested[0].match_reasons)


def test_gmail_sync_updates_existing_thread_instead_of_inserting_duplicate(monkeypatch) -> None:
    monkeypatch.setenv("AUTH_PUBLIC_BASE_URL", "https://auth.dimy.dev")
    monkeypatch.setenv("AUTH_INTERNAL_BASE_URL", "http://100.124.230.107:8100")
    monkeypatch.setenv("AUTH_SERVICE_TOKEN", "shared-secret")
    with build_session() as db:
        db.add(
            EmailThread(
                thread_id="thread-existing",
                subject="Old subject",
                participants_summary="Old sender",
                snippet="Old snippet",
                gmail_url="https://mail.google.com/mail/u/0/#all/thread-existing",
                raw_matching_text="Old subject Old sender",
            )
        )
        db.commit()

        def fake_get(url: str, **kwargs):
            if url == "http://100.124.230.107:8100/oauth/google/token":
                return _json_response(
                    {
                        "access_token": "token",
                        "expiry": datetime.now(UTC).isoformat(),
                        "email": "me@example.com",
                        "scopes": ["openid", "email", "profile", gmail.GMAIL_SCOPE],
                    }
                )
            if url == "http://100.124.230.107:8100/status":
                return _json_response(
                    {
                        "app_id": "janus",
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
                return _json_response({"threads": [{"id": "thread-existing"}]})
            if url == f"{gmail.GMAIL_THREADS_URL}/thread-existing":
                return _json_response(
                    {
                        "id": "thread-existing",
                        "snippet": "Updated snippet",
                        "messages": [
                            {
                                "internalDate": str(int(datetime(2026, 4, 3, 9, 0, tzinfo=UTC).timestamp() * 1000)),
                                "payload": {
                                    "headers": [
                                        {"name": "Subject", "value": "Updated subject"},
                                        {"name": "From", "value": "Recruiting <jobs@example.com>"},
                                        {"name": "To", "value": "me@example.com"},
                                    ]
                                },
                            }
                        ],
                    }
                )
            raise AssertionError(f"Unexpected Gmail GET {url}")

        monkeypatch.setattr(gmail.httpx, "get", fake_get)

        sync_result = gmail.sync_threads(db)
        assert sync_result.threads_synced == 1

        refreshed = db.get(EmailThread, "thread-existing")
        assert refreshed is not None
        assert refreshed.subject == "Updated subject"
        assert refreshed.snippet == "Updated snippet"


def test_run_sync_job_marks_job_succeeded(monkeypatch) -> None:
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session_local = sessionmaker(bind=engine, autoflush=False, autocommit=False, class_=Session)
    Base.metadata.create_all(bind=engine)

    monkeypatch.setattr(gmail, "SessionLocal", testing_session_local)
    monkeypatch.setenv("AUTH_PUBLIC_BASE_URL", "https://auth.dimy.dev")
    monkeypatch.setenv("AUTH_INTERNAL_BASE_URL", "http://100.124.230.107:8100")
    monkeypatch.setenv("AUTH_SERVICE_TOKEN", "shared-secret")

    db = testing_session_local()
    try:
        routes.create_application(
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
        job = GmailSyncJob(status="queued")
        db.add(job)
        db.commit()
        db.refresh(job)

        def fake_get(url: str, **kwargs):
            if url == "http://100.124.230.107:8100/oauth/google/token":
                return _json_response(
                    {
                        "access_token": "token",
                        "expiry": datetime.now(UTC).isoformat(),
                        "email": "me@example.com",
                        "scopes": ["openid", "email", "profile", gmail.GMAIL_SCOPE],
                    }
                )
            if url == "http://100.124.230.107:8100/status":
                return _json_response(
                    {
                        "app_id": "janus",
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

        gmail.run_sync_job(job.id)

        db.expire_all()
        refreshed = db.get(GmailSyncJob, job.id)
        assert refreshed is not None
        assert refreshed.status == "succeeded"
        assert refreshed.threads_synced == 1
        assert refreshed.suggestions_updated == 1
        assert refreshed.finished_at is not None
    finally:
        db.close()


def test_error_message_sanitizes_html_gateway_pages() -> None:
    response = httpx.Response(
        502,
        text="<!DOCTYPE html><html><body>Bad gateway</body></html>",
        headers={"content-type": "text/html; charset=UTF-8"},
    )

    message = gmail._error_message(response, "Could not fetch Google token from auth service.")

    assert message == "Could not fetch Google token from auth service. Upstream returned 502 Bad Gateway."


def _json_response(payload):
    return httpx.Response(200, json=payload)
