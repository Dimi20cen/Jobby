COMPOSE = docker compose -f infra/docker-compose.yml --env-file .env

.PHONY: help install frontend-install backend-install dev-db dev-backend dev-frontend dev dev-split up down logs test-backend build-frontend

help:
	@echo "Jobby developer commands"
	@echo ""
	@echo "  make install           Install frontend and backend dev dependencies"
	@echo "  make dev-db            Start Postgres only in Docker"
	@echo "  make dev-backend       Run FastAPI locally with reload"
	@echo "  make dev-frontend      Run Next.js locally in dev mode"
	@echo "  make dev               Run Postgres + backend reload + frontend dev together"
	@echo "  make dev-split         Print the recommended multi-terminal dev flow"
	@echo "  make up                Start the full Docker stack"
	@echo "  make down              Stop the Docker stack"
	@echo "  make logs              Tail Docker logs"
	@echo "  make test-backend      Run backend tests"
	@echo "  make build-frontend    Run a production frontend build"

install: backend-install frontend-install

backend-install:
	cd backend && uv pip install --system -e ".[dev]"

frontend-install:
	cd frontend && npm install

dev-db:
	$(COMPOSE) up postgres

dev-backend:
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	cd frontend && npm run dev

dev:
	bash scripts/dev.sh

dev-split:
	@echo "Recommended local dev loop:"
	@echo "  Terminal 1: make dev-db"
	@echo "  Terminal 2: make dev-backend"
	@echo "  Terminal 3: make dev-frontend"
	@echo ""
	@echo "Extension settings:"
	@echo "  backend URL   http://localhost:8000"
	@echo "  dashboard URL http://localhost:3000"

up:
	$(COMPOSE) up --build

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f

test-backend:
	cd backend && pytest -q tests

build-frontend:
	cd frontend && npm run build
