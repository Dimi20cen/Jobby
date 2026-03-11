#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  . "$ROOT_DIR/.env"
  set +a
fi

cd "$ROOT_DIR/backend"

echo "Checking Hermes-backed generation path..."

python - <<'PY'
from app.services.llm import generate_application

cover_letter, questions, score, coverage, risks, used_model = generate_application(
    job_description=(
        "We are hiring an AI engineer to build LLM-powered developer tools, retrieval pipelines, "
        "evaluation loops, and full-stack product integrations for end users."
    ),
    cv_text=(
        "Senior software engineer with experience building FastAPI services, Next.js products, "
        "LLM features, evaluation harnesses, structured outputs, and developer-facing AI tools."
    ),
)

print("used_model:", used_model)
print("relevance_score:", score)
print("questions:", len(questions))
print("coverage:", ", ".join(coverage))
print("risks:", ", ".join(risks))
print("cover_letter_preview:", cover_letter[:120].replace("\n", " "))
PY
