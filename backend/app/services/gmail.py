import os
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from typing import Any
from uuid import UUID

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Application, ApplicationEmailLink, EmailThread

AUTH_STATUS_PATH = "/status"
AUTH_GOOGLE_START_PATH = "/oauth/google/start"
AUTH_GOOGLE_TOKEN_PATH = "/oauth/google/token"
GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly"
GMAIL_THREADS_URL = "https://gmail.googleapis.com/gmail/v1/users/me/threads"
MIN_MATCH_SCORE = 50
DEFAULT_RECENT_THREADS = 25
DEFAULT_SEARCH_RESULTS_PER_APPLICATION = 10


class GmailServiceError(RuntimeError):
    pass


@dataclass
class GmailSyncResult:
    threads_synced: int
    suggestions_updated: int


def get_connection_status(db: Session) -> dict[str, Any]:
    _ = db
    status = _fetch_auth_service_status()
    google = status.get("google", {})
    scopes = google.get("scopes") or []
    connected = bool(google.get("connected")) and GMAIL_SCOPE in scopes
    return {
        "connected": connected,
        "email_address": google.get("email") if connected else None,
        "connected_at": None,
        "has_pending_auth": False,
    }


def build_connect_url(db: Session, return_path: str | None) -> str:
    _ = db
    auth_base_url = _require_env("AUTH_BASE_URL")
    frontend_base_url = _require_env("FRONTEND_BASE_URL")
    normalized_return_path = _normalize_return_path(return_path)
    absolute_return_url = f"{frontend_base_url.rstrip('/')}{normalized_return_path}"

    response = httpx.post(
        f"{auth_base_url.rstrip('/')}{AUTH_GOOGLE_START_PATH}",
        json={
            "app": "jobby",
            "scopes": ["openid", "email", "profile", GMAIL_SCOPE],
            "return_url": absolute_return_url,
        },
        timeout=30,
    )
    if response.status_code >= 400:
        raise GmailServiceError(_error_message(response, "Could not start Google OAuth with auth service."))
    auth_url = response.json().get("auth_url")
    if not auth_url:
        raise GmailServiceError("Auth service did not return an auth_url.")
    return auth_url


def sync_threads(db: Session) -> GmailSyncResult:
    access_token = _fetch_google_access_token()
    thread_ids = _collect_thread_ids(db, access_token)
    synced = 0
    for thread_id in thread_ids:
        detail_response = httpx.get(
            f"{GMAIL_THREADS_URL}/{thread_id}",
            headers={"Authorization": f"Bearer {access_token}"},
            params={
                "format": "metadata",
                "metadataHeaders": ["Subject", "From", "To", "Cc", "Date"],
            },
            timeout=30,
        )
        if detail_response.status_code >= 400:
            raise GmailServiceError(_error_message(detail_response, f"Could not fetch Gmail thread {thread_id}."))
        thread_payload = detail_response.json()
        email_thread = db.get(EmailThread, thread_id) or EmailThread(thread_id=thread_id)
        subject, participants_summary, last_message_at, message_count, raw_matching_text = _parse_thread_payload(thread_payload)
        email_thread.subject = subject
        email_thread.participants_summary = participants_summary
        email_thread.snippet = thread_payload.get("snippet", "") or ""
        email_thread.last_message_at = last_message_at
        email_thread.message_count = message_count
        email_thread.gmail_url = f"https://mail.google.com/mail/u/0/#all/{thread_id}"
        email_thread.raw_matching_text = raw_matching_text
        db.add(email_thread)
        synced += 1

    db.commit()
    suggestions_updated = _refresh_link_suggestions(db)
    return GmailSyncResult(threads_synced=synced, suggestions_updated=suggestions_updated)


def _collect_thread_ids(db: Session, access_token: str) -> list[str]:
    thread_ids: list[str] = []
    seen: set[str] = set()

    recent_threads = _gmail_thread_refs(
        access_token,
        max_results=_recent_thread_limit(),
    )
    _append_thread_ids(thread_ids, seen, recent_threads)

    applications = db.execute(
        select(Application).where(Application.status != "archived").order_by(Application.updated_at.desc())
    ).scalars().all()
    per_application_limit = int(
        os.getenv("GMAIL_SYNC_SEARCH_PER_APPLICATION", str(DEFAULT_SEARCH_RESULTS_PER_APPLICATION))
    )

    for application in applications:
        for query in _build_application_queries(application):
            matching_threads = _gmail_thread_refs(
                access_token,
                max_results=per_application_limit,
                query=query,
            )
            _append_thread_ids(thread_ids, seen, matching_threads)

    return thread_ids


def _gmail_thread_refs(access_token: str, max_results: int, query: str | None = None) -> list[dict[str, Any]]:
    params: dict[str, Any] = {"maxResults": max_results}
    if query:
        params["q"] = query
    list_response = httpx.get(
        GMAIL_THREADS_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        params=params,
        timeout=30,
    )
    if list_response.status_code >= 400:
        raise GmailServiceError(_error_message(list_response, "Could not fetch Gmail threads."))
    return list_response.json().get("threads", [])


def _append_thread_ids(
    target: list[str],
    seen: set[str],
    thread_refs: list[dict[str, Any]],
) -> None:
    for thread_ref in thread_refs:
        thread_id = thread_ref.get("id")
        if not thread_id or thread_id in seen:
            continue
        seen.add(thread_id)
        target.append(thread_id)


def _recent_thread_limit() -> int:
    if os.getenv("GMAIL_SYNC_RECENT_THREADS"):
        return int(os.getenv("GMAIL_SYNC_RECENT_THREADS", str(DEFAULT_RECENT_THREADS)))
    return int(os.getenv("GMAIL_SYNC_MAX_RESULTS", str(DEFAULT_RECENT_THREADS)))


def _build_application_queries(application: Application) -> list[str]:
    queries: list[str] = []
    company_name = application.company_name.strip()
    job_title = application.job_title.strip()
    anchor_day = min(application.applied_date or application.created_at.date(), date.today())
    after_day = anchor_day - timedelta(days=45)
    after_filter = f" after:{after_day.strftime('%Y/%m/%d')}"

    if company_name:
        queries.append(f'"{company_name}"{after_filter}')
        queries.append(f'"{company_name}"')
    if job_title and _normalize_text(job_title) != _normalize_text(company_name):
        queries.append(f'"{job_title}"{after_filter}')

    deduped: list[str] = []
    seen: set[str] = set()
    for query in queries:
        if query not in seen:
            seen.add(query)
            deduped.append(query)
    return deduped


def get_application_email_links(db: Session, application_id: UUID) -> dict[str, Any]:
    application = db.get(Application, application_id)
    if application is None:
        raise GmailServiceError("Application not found.")

    links = db.execute(
        select(ApplicationEmailLink, EmailThread)
        .join(EmailThread, EmailThread.thread_id == ApplicationEmailLink.thread_id)
        .where(ApplicationEmailLink.application_id == application.id)
        .order_by(ApplicationEmailLink.match_score.desc(), EmailThread.last_message_at.desc())
    ).all()

    suggested = []
    linked = []
    rejected_thread_ids = []
    for link, thread in links:
        payload = _serialize_thread_link(link, thread)
        if link.status == "linked":
            linked.append(payload)
        elif link.status == "suggested":
            suggested.append(payload)
        elif link.status == "rejected":
            rejected_thread_ids.append(thread.thread_id)

    return {
        "connection": get_connection_status(db),
        "suggested": suggested,
        "linked": linked,
        "rejected_thread_ids": rejected_thread_ids,
    }


def set_link_status(db: Session, application_id: UUID, thread_id: str, status: str) -> dict[str, Any]:
    application = db.get(Application, application_id)
    if application is None:
        raise GmailServiceError("Application not found.")
    thread = db.get(EmailThread, thread_id)
    if thread is None:
        raise GmailServiceError("Email thread not found.")

    link = db.get(ApplicationEmailLink, {"application_id": application.id, "thread_id": thread_id})
    if link is None:
        match_score, reasons = _score_application_thread(application, thread)
        link = ApplicationEmailLink(
            application_id=application.id,
            thread_id=thread_id,
            match_score=match_score,
            match_reasons=reasons,
        )

    link.status = status
    if not link.match_reasons:
        link.match_score, link.match_reasons = _score_application_thread(application, thread)
    db.add(link)
    db.commit()
    return get_application_email_links(db, application.id)


def delete_link(db: Session, application_id: UUID, thread_id: str) -> dict[str, Any]:
    application = db.get(Application, application_id)
    if application is None:
        raise GmailServiceError("Application not found.")
    link = db.get(ApplicationEmailLink, {"application_id": application.id, "thread_id": thread_id})
    if link is not None:
        db.delete(link)
        db.commit()
    return get_application_email_links(db, application.id)


def _serialize_thread_link(link: ApplicationEmailLink, thread: EmailThread) -> dict[str, Any]:
    return {
        "thread_id": thread.thread_id,
        "subject": thread.subject,
        "participants_summary": thread.participants_summary,
        "snippet": thread.snippet,
        "last_message_at": thread.last_message_at,
        "message_count": thread.message_count,
        "gmail_url": thread.gmail_url,
        "status": link.status,
        "match_score": link.match_score,
        "match_reasons": [reason for reason in link.match_reasons if isinstance(reason, str)],
    }


def _refresh_link_suggestions(db: Session) -> int:
    applications = db.execute(select(Application)).scalars().all()
    threads = db.execute(select(EmailThread)).scalars().all()
    existing_links = {
        (link.application_id, link.thread_id): link
        for link in db.execute(select(ApplicationEmailLink)).scalars().all()
    }
    updated = 0

    for application in applications:
        for thread in threads:
            key = (application.id, thread.thread_id)
            existing = existing_links.get(key)
            if existing and existing.status == "linked":
                continue

            score, reasons = _score_application_thread(application, thread)
            if existing and existing.status == "rejected":
                if thread.last_message_at is None or thread.last_message_at <= existing.updated_at:
                    continue

            if score >= MIN_MATCH_SCORE:
                if existing is None:
                    existing = ApplicationEmailLink(
                        application_id=application.id,
                        thread_id=thread.thread_id,
                        status="suggested",
                    )
                existing.status = "suggested"
                existing.match_score = score
                existing.match_reasons = reasons
                db.add(existing)
                updated += 1
            elif existing and existing.status == "suggested":
                db.delete(existing)
                updated += 1

    db.commit()
    return updated


def _score_application_thread(application: Application, thread: EmailThread) -> tuple[int, list[str]]:
    score = 0
    reasons: list[str] = []
    company_text = _normalize_text(application.company_name)
    thread_text = _normalize_text(thread.raw_matching_text)

    if company_text and len(company_text) >= 3 and company_text in thread_text:
        score += 55
        reasons.append(f"Mentions {application.company_name}")
    else:
        company_tokens = [token for token in company_text.split() if len(token) >= 3]
        overlap = [token for token in company_tokens if token in thread_text]
        if overlap:
            token_score = min(30, len(overlap) * 12)
            score += token_score
            reasons.append(f"Company overlap on {', '.join(overlap[:3])}")

    title_tokens = [token for token in _normalize_text(application.job_title).split() if len(token) >= 4]
    title_overlap = [token for token in title_tokens if token in thread_text]
    if title_overlap:
        title_score = min(20, len(title_overlap) * 8)
        score += title_score
        reasons.append(f"Role overlap on {', '.join(title_overlap[:3])}")

    job_domain = _extract_domain(application.job_url)
    if job_domain:
        participant_text = _normalize_text(thread.participants_summary)
        if job_domain in participant_text:
            score += 20
            reasons.append(f"Sender domain matches {job_domain}")

    anchor_day = application.applied_date or application.created_at.date()
    if thread.last_message_at:
        delta = abs((thread.last_message_at.date() - anchor_day).days)
        if delta <= 21:
            score += 10
            reasons.append("Recent to application timeline")
        elif delta <= 60:
            score += 5
            reasons.append("Roughly aligned with application timeline")

    return score, reasons


def _parse_thread_payload(payload: dict[str, Any]) -> tuple[str, str, datetime | None, int, str]:
    messages = payload.get("messages", [])
    subject = ""
    participants: list[str] = []
    last_message_at: datetime | None = None

    for message in messages:
        headers = {
            header.get("name", "").lower(): header.get("value", "")
            for header in message.get("payload", {}).get("headers", [])
        }
        if not subject:
            subject = headers.get("subject", "") or subject
        for key in ("from", "to", "cc"):
            value = headers.get(key)
            if value:
                participants.append(value)
        internal_date = message.get("internalDate")
        if internal_date:
            message_time = datetime.fromtimestamp(int(internal_date) / 1000, tz=UTC)
            if last_message_at is None or message_time > last_message_at:
                last_message_at = message_time

    participants_summary = " | ".join(dict.fromkeys(participants))
    raw_matching_text = " ".join(
        item
        for item in [
            subject,
            payload.get("snippet", ""),
            participants_summary,
        ]
        if item
    )
    return subject, participants_summary, last_message_at, len(messages), raw_matching_text


def _fetch_auth_service_status() -> dict[str, Any]:
    auth_base_url = _require_env("AUTH_BASE_URL")
    response = httpx.get(f"{auth_base_url.rstrip('/')}{AUTH_STATUS_PATH}", timeout=30)
    if response.status_code >= 400:
        raise GmailServiceError(_error_message(response, "Could not fetch auth service status."))
    return response.json()


def _fetch_google_access_token() -> str:
    auth_base_url = _require_env("AUTH_BASE_URL")
    auth_service_token = _require_env("AUTH_SERVICE_TOKEN")
    response = httpx.get(
        f"{auth_base_url.rstrip('/')}{AUTH_GOOGLE_TOKEN_PATH}",
        headers={"Authorization": f"Bearer {auth_service_token}"},
        params={"scope": GMAIL_SCOPE},
        timeout=30,
    )
    if response.status_code >= 400:
        raise GmailServiceError(_error_message(response, "Could not fetch Google token from auth service."))
    access_token = response.json().get("access_token")
    if not access_token:
        raise GmailServiceError("Auth service did not return a Google access token.")
    return access_token


def _require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise GmailServiceError(f"{name} must be set before using Gmail integration.")
    return value


def _normalize_return_path(return_path: str | None) -> str:
    if not return_path or not return_path.startswith("/"):
        return "/"
    return return_path


def _normalize_text(value: str | None) -> str:
    if not value:
        return ""
    cleaned = "".join(char.lower() if char.isalnum() else " " for char in value)
    return " ".join(cleaned.split())


def _extract_domain(url: str | None) -> str:
    if not url:
        return ""
    from urllib.parse import urlparse

    parsed_url = urlparse(url)
    hostname = parsed_url.hostname or ""
    if hostname.startswith("www."):
        hostname = hostname[4:]
    return hostname.lower()


def _error_message(response: httpx.Response, fallback: str) -> str:
    if response.headers.get("content-type", "").startswith("application/json"):
        payload = response.json()
        if isinstance(payload, dict):
            if "detail" in payload:
                return str(payload["detail"])
            error = payload.get("error")
            if isinstance(error, dict) and error.get("message"):
                return str(error["message"])
            if isinstance(error, str):
                return error
    return response.text or fallback
