#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT_DIR/logs"

mkdir -p "$LOG_DIR"

cd "$ROOT_DIR"

echo "Starting Postgres (pgvector)..."
docker compose up -d

echo "Running migrations..."
MIGRATIONS=(
  "/migrations/001_create_audit_log.sql"
  "/migrations/002_create_core_tables.sql"
  "/migrations/003_create_policy_audit.sql"
  "/migrations/004_create_scraper_run.sql"
  "/migrations/007_add_orgs.sql"
  "/migrations/005_reset_checklist_embeddings.sql"
  "/migrations/008_reset_app_setting.sql"
  "/migrations/009_add_classification.sql"
  "/migrations/010_create_users.sql"
)

for migration in "${MIGRATIONS[@]}"; do
  docker compose exec db psql -U safescale -d safescale -f "$migration"
done

cleanup() {
  echo "\nShutting down dev services..."
  [[ -n "${BACKEND_PID:-}" ]] && kill "$BACKEND_PID" 2>/dev/null || true
  [[ -n "${FRONTEND_PID:-}" ]] && kill "$FRONTEND_PID" 2>/dev/null || true
  [[ -n "${DB_LOG_PID:-}" ]] && kill "$DB_LOG_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"
DB_LOG="$LOG_DIR/db.log"

: > "$BACKEND_LOG"
: > "$FRONTEND_LOG"
: > "$DB_LOG"

cd "$ROOT_DIR/backend"
if [ ! -d ".venv" ]; then
  python -m venv .venv
fi
source .venv/bin/activate
pip install -e .

echo "Starting backend on http://localhost:8000"
uvicorn app.main:app --reload >"$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

deactivate

cd "$ROOT_DIR/frontend"
if [ ! -d "node_modules" ]; then
  npm install
fi

echo "Starting frontend on http://localhost:3000"
npm run dev >"$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!

echo "Tailing Docker DB logs"
docker compose logs -f --tail=50 db >"$DB_LOG" 2>&1 &
DB_LOG_PID=$!

sleep 1

echo "\nLogs are streaming. Press Ctrl+C to stop."
exec tail -n 200 -f "$BACKEND_LOG" "$FRONTEND_LOG" "$DB_LOG"
