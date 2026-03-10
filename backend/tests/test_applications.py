from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api import routes
from app.db.models import Base
from app.schemas import CreateApplicationRequest, UpdateApplicationRequest


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


def test_create_list_and_activity() -> None:
    with build_session() as db:
        created = routes.create_application(
            CreateApplicationRequest(
                company_name="OpenAI",
                job_title="AI Engineer",
                status="applied",
                applied_date="2026-03-09",
                location="Remote",
                job_url="https://example.com/jobs/1",
                job_description="Build product-grade AI systems for users.",
                cv_used="Experienced software engineer with shipped AI features.",
                notes="Strong fit for product engineering.",
                cover_letter="",
                interview_questions=[],
                tailored_bullets=[],
            ),
            db,
        )
        assert created.company_name == "OpenAI"
        assert created.status == "applied"

        items = routes.list_applications(status_filter=None, job_url=None, limit=100, sort="updated_at", db=db).items
        assert len(items) == 1
        assert items[0].job_title == "AI Engineer"

        activity = routes.application_activity(days=7, db=db).items
        assert sum(point.count for point in activity) == 1


def test_list_applications_can_filter_by_job_url() -> None:
    with build_session() as db:
        routes.create_application(
            CreateApplicationRequest(
                company_name="OpenAI",
                job_title="AI Engineer",
                status="draft",
                applied_date=None,
                location="Remote",
                job_url="https://example.com/jobs/1",
                job_description="Build product-grade AI systems for users.",
                cv_used="Experienced software engineer with shipped AI features.",
                notes="",
                cover_letter="",
                interview_questions=[],
                tailored_bullets=[],
            ),
            db,
        )
        routes.create_application(
            CreateApplicationRequest(
                company_name="Elsewhere",
                job_title="Backend Engineer",
                status="draft",
                applied_date=None,
                location="Remote",
                job_url="https://example.com/jobs/2",
                job_description="Build backend systems for internal tooling.",
                cv_used="Experienced backend engineer with API and platform work.",
                notes="",
                cover_letter="",
                interview_questions=[],
                tailored_bullets=[],
            ),
            db,
        )

        items = routes.list_applications(
            status_filter=None,
            job_url="https://example.com/jobs/1",
            limit=100,
            sort="updated_at",
            db=db,
        ).items
        assert len(items) == 1
        assert items[0].company_name == "OpenAI"


def test_generate_for_application(monkeypatch) -> None:
    with build_session() as db:
        created = routes.create_application(
            CreateApplicationRequest(
                company_name="Example",
                job_title="Analyst",
                status="draft",
                applied_date=None,
                location="Helsinki",
                job_url=None,
                job_description="A" * 40,
                cv_used="B" * 40,
                notes="",
                cover_letter="",
                interview_questions=[],
                tailored_bullets=[],
            ),
            db,
        )

        monkeypatch.setattr(
            routes,
            "generate_application",
            lambda job_description, cv_text: (
                ["Impact bullet"],
                "Tailored cover letter body",
                ["Question 1", "Question 2"],
                82,
                ["SQL", "Stakeholder communication"],
                ["Needs quantified outcomes"],
                "models/gemini-2.5-flash",
            ),
        )

        generated = routes.generate_for_application(created.id, db)
        assert generated.cover_letter == "Tailored cover letter body"
        assert generated.interview_questions == ["Question 1", "Question 2"]
        assert generated.used_model == "models/gemini-2.5-flash"


def test_update_requires_applied_date_for_applied_status() -> None:
    with build_session() as db:
        created = routes.create_application(
            CreateApplicationRequest(
                company_name="Example",
                job_title="Analyst",
                status="draft",
                applied_date=None,
                location=None,
                job_url=None,
                job_description="",
                cv_used="",
                notes="",
                cover_letter="",
                interview_questions=[],
                tailored_bullets=[],
            ),
            db,
        )

        try:
            routes.update_application(
                created.id,
                UpdateApplicationRequest(status="applied", applied_date=None),
                db,
            )
        except Exception as exc:
            assert "applied_date" in str(exc.detail)
        else:
            raise AssertionError("Expected update_application to reject applied status without applied_date")
