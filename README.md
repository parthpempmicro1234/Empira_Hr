# Empira_Hr

Empira_Hr is a split HR management application:

- Backend: Django, Django REST Framework, Channels, Celery, SQLite/PostgreSQL-ready settings, Redis-backed cache/websocket support.
- Frontend: React 19 + TypeScript on Vite, built with npm.

Local development defaults:

- Backend entry point: `hrms_project/manage.py`, served by Django/Daphne on port `8000`.
- Frontend entry point: `Empira_HR_UI/src/main.tsx`, served by Vite on port `5173`.
- Redis: `6379` when cache, Celery, or Channels are backed by Redis.

Docker Compose uses non-conflicting host ports by default:

- Frontend: `http://localhost:5174`
- Backend: `http://localhost:8001`
- Redis: `localhost:6380`

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the Docker Compose setup, GitHub Actions
pipeline, required repository secrets, GHCR images, Render deployment, live
verification, and rollback instructions.
