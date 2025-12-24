# SafeScale AI

Full-stack compliance command center.

## Quick start

Requirements: Docker, Python 3.11+, Node 18+.

```bash
./scripts/dev-up.sh
```

This starts Postgres, runs migrations, boots the FastAPI backend on
`http://localhost:8000`, and the Next.js frontend on `http://localhost:3000`.

For a log-tailing dev loop:

```bash
./scripts/dev-watch.sh
```

## Environment

Frontend reads env from `frontend/.env.local` (Next.js default). Backend reads
env from your shell. Copy the sample and set what you need:

```bash
cp .env.example frontend/.env.local
```

Backend example:

```bash
export DATABASE_URL="postgresql+asyncpg://safescale:safescale_dev@localhost:5432/safescale"
export ADMIN_BOOTSTRAP_TOKEN="change-me"
export JWT_SECRET="change-me"
export OPENAI_API_KEY="..."
```

### Recent additions

- Reports: CSV/PDF exports for audits and alerts, plus per-audit PDF reports.
- Themes: light, dark, Jellyseerr, and Obsidian (default).
- Settings: industry selector, embedding threshold, checklist reset, and a full org reset button for testing.

If you have an existing database, run the latest migration before testing:

```bash
docker compose exec db psql -U safescale -d safescale -f /migrations/011_add_industry.sql
```

### Defaults

Migrations seed a default org with API key `dev-api-key` (still supported).

To create orgs through auth, use the register endpoint (or use the Settings UI):

```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123","org_name":"Acme"}'
```

Then sign in via the Settings page to store the session token in the browser.

## Theme

Use the theme toggle in the top-right header to switch between light and dark mode.

For admin-created orgs, set `ADMIN_BOOTSTRAP_TOKEN` and call:

```bash
curl -X POST http://localhost:8000/admin/orgs \
  -H "X-Admin-Token: change-me" \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme"}'
```

## Project layout

- `backend/`: FastAPI app, SQL migrations, MCP server, storage
- `frontend/`: Next.js UI
- `shared/contracts/`: shared TS contracts
- `scripts/`: dev tooling and local boot scripts
