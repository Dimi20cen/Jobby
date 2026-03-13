from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def migrate_application_schema(engine: Engine) -> None:
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())
    if "applications" not in table_names:
        return

    existing_columns = {column["name"] for column in inspector.get_columns("applications")}
    statements = [
        ("company_name", "ALTER TABLE applications ADD COLUMN company_name TEXT"),
        ("job_title", "ALTER TABLE applications ADD COLUMN job_title TEXT"),
        ("location", "ALTER TABLE applications ADD COLUMN location TEXT"),
        ("status", "ALTER TABLE applications ADD COLUMN status TEXT DEFAULT 'draft'"),
        ("applied_date", "ALTER TABLE applications ADD COLUMN applied_date DATE"),
        ("job_url", "ALTER TABLE applications ADD COLUMN job_url TEXT"),
        ("cv_used", "ALTER TABLE applications ADD COLUMN cv_used TEXT"),
        ("notes", "ALTER TABLE applications ADD COLUMN notes TEXT DEFAULT ''"),
        ("interview_questions", "ALTER TABLE applications ADD COLUMN interview_questions JSON"),
        ("used_model", "ALTER TABLE applications ADD COLUMN used_model TEXT"),
        ("relevance_score", "ALTER TABLE applications ADD COLUMN relevance_score INTEGER"),
        ("jd_coverage", "ALTER TABLE applications ADD COLUMN jd_coverage JSON"),
        ("risk_flags", "ALTER TABLE applications ADD COLUMN risk_flags JSON"),
        ("updated_at", "ALTER TABLE applications ADD COLUMN updated_at TIMESTAMP"),
    ]

    with engine.begin() as connection:
        for column_name, ddl in statements:
            if column_name not in existing_columns:
                connection.execute(text(ddl))

        if "cv_text" in existing_columns:
            connection.execute(
                text(
                    "UPDATE applications SET cv_used = COALESCE(NULLIF(cv_used, ''), cv_text)"
                    " WHERE cv_text IS NOT NULL"
                )
            )
        connection.execute(text("UPDATE applications SET company_name = COALESCE(NULLIF(company_name, ''), 'Unknown company')"))
        connection.execute(text("UPDATE applications SET job_title = COALESCE(NULLIF(job_title, ''), 'Untitled role')"))
        connection.execute(text("UPDATE applications SET status = COALESCE(NULLIF(status, ''), 'draft')"))
        connection.execute(text("UPDATE applications SET notes = COALESCE(notes, '')"))
        connection.execute(text("UPDATE applications SET cv_used = COALESCE(cv_used, '')"))
        connection.execute(text("UPDATE applications SET cover_letter = COALESCE(cover_letter, '')"))
        connection.execute(text("UPDATE applications SET updated_at = COALESCE(updated_at, created_at)"))

        if "gmail_connections" in table_names:
            connection.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS ix_gmail_connections_email_address"
                    " ON gmail_connections (email_address)"
                )
            )

        if "email_threads" in table_names:
            connection.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_email_threads_last_message_at"
                    " ON email_threads (last_message_at)"
                )
            )

        if "application_email_links" in table_names:
            connection.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_application_email_links_status"
                    " ON application_email_links (status)"
                )
            )
            connection.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_application_email_links_updated_at"
                    " ON application_email_links (updated_at)"
                )
            )
