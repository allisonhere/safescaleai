#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

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

echo "Setting up backend virtualenv..."
cd "$ROOT_DIR/backend"
if [ ! -d ".venv" ]; then
  python -m venv .venv
fi
source .venv/bin/activate
pip install -e .

echo "Starting backend on http://localhost:8000"
uvicorn app.main:app --reload &
BACKEND_PID=$!

echo "Starting frontend on http://localhost:3000"
cd "$ROOT_DIR/frontend"
if [ ! -d "node_modules" ]; then
  npm install
fi
npm run dev

kill "$BACKEND_PID"
