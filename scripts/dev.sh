#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEV_COMPOSE=(docker compose -f "$ROOT_DIR/infra/docker-compose.dev.yml" --env-file "$ROOT_DIR/.env")
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

if [[ ! -f "$ROOT_DIR/.env" ]]; then
  echo "[dev] Missing .env file. Create it from .env.example first." >&2
  exit 1
fi

if ! command -v uvicorn >/dev/null 2>&1; then
  echo "[dev] Missing uvicorn. Run 'make install' first." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "[dev] Missing npm. Install Node.js/npm first." >&2
  exit 1
fi

prefix_output() {
  local label="$1"
  if command -v stdbuf >/dev/null 2>&1; then
    stdbuf -oL -eL sed -u "s/^/[$label] /"
  else
    sed -u "s/^/[$label] /"
  fi
}

cleanup() {
  local exit_code=${1:-0}
  trap - EXIT INT TERM

  if [[ -n "${BACKEND_PID:-}" ]]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi

  if [[ -n "${FRONTEND_PID:-}" ]]; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi

  "${DEV_COMPOSE[@]}" stop postgres >/dev/null 2>&1 || true
  wait >/dev/null 2>&1 || true
  exit "$exit_code"
}

trap 'cleanup $?' EXIT
trap 'cleanup 130' INT TERM

echo "[dev] Starting Postgres in Docker..."
"${DEV_COMPOSE[@]}" up -d postgres >/dev/null

echo "[dev] Starting backend reload server on http://localhost:${BACKEND_PORT}"
(
  cd "$ROOT_DIR/backend"
  uvicorn app.main:app --reload --host 0.0.0.0 --port "$BACKEND_PORT" 2>&1 | prefix_output backend
) &
BACKEND_PID=$!

echo "[dev] Starting frontend dev server on http://localhost:${FRONTEND_PORT}"
(
  cd "$ROOT_DIR/frontend"
  npm run dev 2>&1 | prefix_output frontend
) &
FRONTEND_PID=$!

echo "[dev] Jobby dev stack is up."
echo "[dev] Backend:   http://localhost:${BACKEND_PORT}"
echo "[dev] Frontend:  http://localhost:${FRONTEND_PORT}"
echo "[dev] Extension: backend URL http://localhost:${BACKEND_PORT}, dashboard URL http://localhost:${FRONTEND_PORT}"
echo "[dev] Press Ctrl+C to stop everything."

wait -n "$BACKEND_PID" "$FRONTEND_PID"
