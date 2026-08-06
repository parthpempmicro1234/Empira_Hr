# Deployment

## Project Shape

Empira_Hr is split into two deployable services:

- `backend`: Django/DRF/Channels app in `hrms_project`, containerized by `hrms_project/Dockerfile`, served with Daphne.
- `frontend`: React/TypeScript/Vite app in `Empira_HR_UI`, containerized by `Empira_HR_UI/Dockerfile`, served by Nginx.

The frontend is built with npm from `package-lock.json`. The backend uses Python dependencies from `hrms_project/requirements.deploy.txt` because the original `requirements.txt` contains local macOS wheel paths that are not installable in CI or Docker.

## Local Docker Verification

Build and run the full stack:

```sh
docker compose up --build
```

Redis starts first and must pass `redis-cli ping`; the Django backend then
starts, applies migrations, collects static files, and must pass its HTTP
health check before the frontend starts. Both application images use
multi-stage builds and maintain their own `.dockerignore` files.

If those host ports are occupied, choose non-conflicting mappings without stopping the existing processes:

```sh
FRONTEND_HOST_PORT=5175 \
BACKEND_HOST_PORT=8002 \
REDIS_HOST_PORT=6381 \
FRONTEND_PUBLIC_URL=http://localhost:5175 \
BACKEND_PUBLIC_URL=http://localhost:8002/ \
docker compose -p empira-verify up --build
```

Default host ports avoid the usual local dev ports:

- Frontend: `http://localhost:5174`
- Backend: `http://localhost:8001/admin/login/`
- Redis: `localhost:6380`

Stop the stack:

```sh
docker compose down
```

## GitHub Actions Pipeline

Workflow file: `.github/workflows/ci-cd.yml`

The workflow runs on every push to `main` and can also be started manually with `workflow_dispatch`.

Stages:

1. Backend install, lint, and test: installs Python dependencies, runs `python manage.py check`, then runs every currently runnable Django test class explicitly. Explicit labels avoid the existing `attendance/tests.py` and `attendance/tests/` discovery collision.
2. Frontend install, lint, and test: runs `npm ci`, checks ESLint against the existing-source baseline in `.github/scripts/check-frontend-lint.mjs`, runs `npm test --if-present`, builds the Vite production bundle, and verifies the generated HTML and JavaScript assets. Existing findings are accepted without modifying application source; new lint findings and invalid ESLint configuration fail the pipeline.
3. Docker build and push: validates the publishing secret and frontend repository variable, builds `ghcr.io/parthpempmicro1234/empira-hr-backend` and `ghcr.io/parthpempmicro1234/empira-hr-frontend`, then pushes `main`, `latest`, and commit-SHA tags to GHCR.
4. Deploy: triggers Render deploys of the immutable commit-SHA image tags through the Render API after all earlier stages pass.
5. Live verification: requires eight consecutive successful public responses from both the backend admin-login endpoint and the frontend health endpoint before the workflow can finish green.

The image-backed services are:

| Service | GHCR image | Render service ID secret | Verification URL variable |
| --- | --- | --- | --- |
| Backend | `ghcr.io/parthpempmicro1234/empira-hr-backend:main` | `RENDER_BACKEND_SERVICE_ID` | `RENDER_BACKEND_URL` |
| Frontend | `ghcr.io/parthpempmicro1234/empira-hr-frontend:main` | `RENDER_FRONTEND_SERVICE_ID` | `RENDER_FRONTEND_URL` |

Deploy will not run if dependency installation, a new frontend lint violation, a deployment-gating test, Docker build, or image push fails. The workflow also fails if either Render deploy fails or either public service does not become consistently reachable after deployment.

Notes on current test coverage:

- Backend deployment-gating tests exclude `attendance.tests.test_attendance_policies`, whose fixtures call an old `create_user` signature.
- Backend deployment-gating tests include all working notification suites and exclude only `notifications.tests.BroadcastTests.test_broadcast_notification_calls_group_send`, whose mock channel layer is synchronous while the current broadcast path awaits it.
- The frontend package has no test script, so `npm test --if-present` is a no-op until one is added.
- The frontend package's `npm run build` script also runs `tsc -b`, which currently fails on existing TypeScript strictness issues; Docker and CI use `npx vite build` to verify the production bundle without changing app source.

## Required GitHub Actions Secrets

Required:

- `GHCR_TOKEN`: a GitHub personal access token with `write:packages` (and the implied `read:packages`) permission. The Docker job validates this secret and uses it to authenticate its GHCR image pushes. Rotate it before its configured expiration and update the repository secret without committing the token.
- `RENDER_API_KEY`: Render API key from Account Settings.
- `RENDER_BACKEND_SERVICE_ID`: the service ID copied from the newly created Django backend service in Render.
- `RENDER_FRONTEND_SERVICE_ID`: the service ID copied from the newly created React frontend service in Render.

## Required GitHub Actions Repository Variables

These values are public configuration, not secrets. Set them under **Settings → Secrets and variables → Actions → Variables**:

- `VITE_API_URL`: `https://empira-hr-backend.onrender.com/`. This is a Vite build-time value, so the production frontend image must be rebuilt when it changes.
- `RENDER_BACKEND_URL`: `https://empira-hr-backend.onrender.com/admin/login/`.
- `RENDER_FRONTEND_URL`: `https://empira-hr-frontend.onrender.com/healthz`.

Optional secret:

- `VITE_WS_NOTIFICATIONS_URL`: websocket notifications URL, if different from the backend URL-derived default.

Render service environment variables should include:

- `DJANGO_DEBUG=False`
- `DJANGO_SECRET_KEY`
- `DJANGO_ALLOWED_HOSTS`
- `CORS_ALLOWED_ORIGINS`
- `FRONTEND_URL`
- `DATABASE_URL` if using PostgreSQL instead of the container's SQLite fallback.
- `REDIS_URL`, `REDIS_CACHE_URL`, and `CHANNEL_REDIS_URL` if using a Redis service.
- Email settings such as `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, and `DEFAULT_FROM_EMAIL` if OTP/email flows are required.

## Render Setup

Current free, image-backed services in the Oregon region:

- Frontend: [https://empira-hr-frontend.onrender.com/](https://empira-hr-frontend.onrender.com/)
- Backend health/login: [https://empira-hr-backend.onrender.com/admin/login/](https://empira-hr-backend.onrender.com/admin/login/)

Create two Render Web Services using "Deploy an existing image from a registry":

- Backend image: `ghcr.io/parthpempmicro1234/empira-hr-backend:main`
- Frontend image: `ghcr.io/parthpempmicro1234/empira-hr-frontend:main`

Set the backend health-check path to `/admin/login/` and the frontend
health-check path to `/healthz`. Configure the backend's `FRONTEND_URL` and
`CORS_ALLOWED_ORIGINS` with the actual frontend Render origin so requests from
the production frontend are permitted. Choose an instance type and region in
the Render account during service creation.

Free instances can spin down after inactivity. Their filesystems are ephemeral,
so configure a managed PostgreSQL `DATABASE_URL` before relying on persistent
application data. Add managed Redis URLs if production Celery jobs, shared cache,
or cross-instance websocket delivery are required.

After creating the services, copy each service ID from the Render service URL or settings page and add it to the GitHub repository secrets listed above.

The workflow deploy step uses the Render API endpoint `POST /v1/services/{serviceId}/deploys` and passes the GHCR commit-SHA image tag. A Render service must therefore be configured as an image-backed service; the workflow intentionally fails instead of silently switching to a source-connected deployment. The packages are public in GHCR; if their visibility is changed to private, configure a Render registry credential with a token that can read the packages.

After the services are created, check their actual URLs directly:

```sh
curl --fail "$RENDER_BACKEND_URL"
curl --fail "$RENDER_FRONTEND_URL"
```

## Triggering A Deploy

Push to `main`:

```sh
git push origin main
```

Or manually run the `CI/CD` workflow from the GitHub Actions tab.

## Rollback

In Render:

1. Open the affected service.
2. Go to the Deploys tab.
3. Pick the last known-good deploy.
4. Use Render's rollback action to restore it.

The Render API also supports rollbacks with `POST /v1/services/{serviceId}/rollback` and a previous deploy ID.
