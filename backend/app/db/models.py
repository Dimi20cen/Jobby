import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Text, Uuid
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_description: Mapped[str] = mapped_column(Text, nullable=False)
    cv_text: Mapped[str] = mapped_column(Text, nullable=False)
    tailored_bullets: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    cover_letter: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
