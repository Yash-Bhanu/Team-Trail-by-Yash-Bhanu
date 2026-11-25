# TeamTrail by Yash Bhanu

**Catch project risks before the final demo.**

TeamTrail is a privacy-first early-warning dashboard for university professors, hackathon mentors, and student project teams. It combines least-privilege GitHub metadata, 60-second weekly student check-ins, and deterministic risk detection rules to surface blockers and collaboration risks early—without surveillance, automated grading, or external AI APIs.

## Technology Stack

- **Framework:** Next.js 15 App Router, React 19, TypeScript (strict mode)
- **Styling & UI:** Tailwind CSS, Radix UI primitives, Lucide icons, Recharts
- **Database & ORM:** PostgreSQL, Drizzle ORM (`src/server/db/schema/index.ts`)
- **Authentication:** Better Auth with GitHub OAuth (`read:user`, `user:email`)
- **GitHub Integration:** GitHub App via Octokit (`Metadata: read`, `Pull requests: read`, `Issues: read`)
- **Validation & Logging:** Zod, Pino (with secret redaction)
- **Testing & QA:** Vitest, Playwright, static security scanner

## Architecture Overview

- `src/app/` — Public landing page (`/`), isolated read-only Guest Demo (`/demo`), Sign-In (`/sign-in`), Role-guarded Dashboards (`/dashboard/*`), and typed REST API routes (`/api/*`).
- `src/server/authorization/` — Centralized default-deny `can(user, action, resource)` & `enforce()` policy engine.
- `src/server/webhooks/` — Constant-time HMAC SHA-256 webhook verification (`POST /api/webhooks/github`), transient metadata extraction, and replay-resistant delivery receipts.
- `src/server/jobs/` — PostgreSQL-backed durable job queue (`FOR UPDATE SKIP LOCKED`, leases, exponential backoff) and worker process (`npm run worker`).
- `src/server/metrics/` — Pure deterministic risk detection rules (`RISK-001` through `RISK-006`) with injectable clock.

## Local Setup (Windows PowerShell)

1. **Install dependencies:**
   ```powershell
   npm install
   ```
2. **Configure environment:**
   ```powershell
   Copy-Item .env.example .env.local
   ```
   Fill in `DATABASE_URL`, `BETTER_AUTH_SECRET`, and (when ready for live auth/GitHub App) `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_APP_*`, and `GITHUB_WEBHOOK_SECRET`.
3. **Start PostgreSQL (via Docker Compose or local PostgreSQL):**
   ```powershell
   docker compose up -d postgres
   npm run db:push
   ```
4. **Run the development server and background worker:**
   ```powershell
   npm run dev
   # In a separate terminal:
   npm run worker
   ```
5. **Explore Guest Demo without auth:**
   Visit `http://localhost:3000/demo` for the isolated 13-team synthetic demonstration.

## Bootstrap an Administrator

Sign in once via GitHub OAuth, then run:
```powershell
npx tsx scripts/bootstrap-admin.ts your-email@example.com
```

## Verification Commands

```powershell
npm run typecheck
npm run test
npm run security:scan
npm run build
```

## Known Limitations

- PostgreSQL and Docker are not pre-installed in this local Windows environment; database migrations and integration tests require a running PostgreSQL instance (`DATABASE_URL`).
- GitHub OAuth and GitHub App credentials are external configuration; when unset, `/sign-in` renders an explicit configuration-required state.
