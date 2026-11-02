# CampusFind

CampusFind is a campus lost-property and recovery application. Students can browse and report lost or found belongings, submit ownership claims, and follow a moderated handover process. Administrators review reports and verify completed handovers.

## Problem statement

Lost property on campus is often handled through scattered messages, office visits, and informal noticeboards. Students may not know where to search, and finders lack a consistent way to verify ownership and return an item safely.

## Project objectives

- Give students one reliable place to report and search for missing belongings.
- Keep personal claim evidence private to authorised participants.
- Provide moderators with server-enforced tools for report and claim review.
- Make report, claim, and handover status visible to the people involved.

## Current features

- Student registration and login with bcrypt-hashed passwords and signed JWTs.
- Role-aware API access; user roles are assigned by the server.
- Report creation, owned pending-report editing/deletion, and public browsing/search/filtering for approved or recovered listings.
- Ranked possible-match suggestions based on item keywords, category, location, and date proximity.
- Student and administrator dashboards with real database-backed counts and moderation queues.
- Report moderation and ownership claim workflows, including claimant notifications.
- Handover codes after claim approval, with administrator-only completion.
- PostgreSQL-ready Prisma schema for production workloads, while local development can continue to use SQLite or a local Postgres connection.
- Angular responsive client shell connected to the same-origin REST API.

## Technology

- Angular, TypeScript, Router, Reactive Forms, HttpClient
- Node.js, Express, TypeScript, Zod
- PostgreSQL/Prisma ORM with Neon-ready configuration
- bcryptjs and JSON Web Tokens

## Architecture

`frontend/` contains the Angular single-page application. `backend/` contains the Express API and Prisma schema. The app is designed to be deployed behind a single Vercel project, with the frontend and API sharing the same domain and using same-origin `/api/*` calls.

```text
CampusFind/
├── backend/
│   ├── prisma/          # SQLite schema, migrations, and seed
│   ├── src/              # Express API and match scoring
│   └── API.md            # Endpoint details
└── frontend/
    └── src/app/
        ├── core/         # Auth, guards, API services, shared types
        └── features/     # Public, student, and admin pages
```

## Requirements

- Node.js 24 or another version supported by the installed Angular CLI
- npm

## Local setup

1. From the repository root, install both workspaces:

   ```powershell
   npm ci
   ```

   Install only once from the root; do not run `npm ci` separately in `backend` or `frontend`.

2. Configure the API in `backend/.env` (copy `backend/.env.example` if needed). Set PostgreSQL `DATABASE_URL` and `DIRECT_URL`, a random `JWT_SECRET` of at least 32 characters, and local `ADMIN_EMAIL` and `ADMIN_PASSWORD` values. The seed administrator password must be at least 14 characters.

3. Generate Prisma Client, apply the database migrations, and load demonstration data:

   ```powershell
   npm run db:generate --workspace=backend
   npm run db:migrate --workspace=backend
   npm run db:seed --workspace=backend
   ```

4. Start both the API and frontend together from the repository root:

   ```powershell
   npm run dev
   ```

   Open `http://localhost:4200`. Both servers stop when you press **Ctrl+C**.

### Share a local demo on the same Wi-Fi

Run `npm run dev:lan` from the repository root instead. On the computer running CampusFind, find its local IPv4 address with `ipconfig`, then have the other person open `http://<your-IPv4-address>:4200` on the same Wi-Fi network. For example, if the IPv4 address is `192.168.1.25`, they would open `http://192.168.1.25:4200`. Allow Node.js through Windows Firewall on a **Private network** if prompted.

This LAN mode is for temporary demos on a trusted network, not public hosting. Someone outside your Wi-Fi cannot reach that address; use a deployment or an approved secure tunnel for remote access. Do not expose real personal data or production credentials in a development demo.

## Demo accounts

The seed script creates an administrator using `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `backend/.env`. The local example values are `admin@campusfind.local` / `ChangeMe123!`; change these before seeding if desired. The seed script refuses to run when `NODE_ENV=production`.

Seeded students:

- `alex.student@campusfind.local` / `Student123!`
- `sam.student@campusfind.local` / `Student123!`

Demonstration credentials are for local coursework only. Never reuse them in a deployed environment.

## API overview

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/api/health` | Public | Health check |
| POST | `/api/auth/register` | Public | Register as a student |
| POST | `/api/auth/login` | Public | Authenticate |
| GET | `/api/auth/me` | Authenticated | Current account |
| GET | `/api/reports` | Public | Browse and filter approved/recovered reports |
| GET | `/api/reports/:id` | Public | View report details |
| POST | `/api/reports` | Student | Submit a report for review |
| GET | `/api/my/reports` | Authenticated | List own reports |
| PATCH / DELETE | `/api/reports/:id` | Owner | Edit or delete own pending/rejected report |
| GET | `/api/reports/:id/matches` | Owner or admin | Suggest possible found-item matches |
| PATCH | `/api/reports/:id/moderate` | Admin | Approve or reject a report |
| POST | `/api/reports/:id/claims` | Student | Claim a found item |
| GET | `/api/my/claims` | Authenticated | List own claims |
| GET | `/api/reports/:id/claims` | Report owner or admin | Review claims |
| PATCH | `/api/claims/:id/review` | Report owner or admin | Approve or reject a claim |
| POST | `/api/admin/claims/:id/verify-handover` | Admin | Verify handover and recover item |
| GET | `/api/admin/reports` | Admin | Load report moderation queue |
| GET | `/api/admin/claims` | Admin | Load claim review and handover queues |
| GET | `/api/notifications` | Authenticated | List own notifications |
| PATCH | `/api/notifications/:id/read` | Authenticated | Mark own notification read |
| GET | `/api/admin/dashboard` | Admin | Get live platform counts |

Request validation errors use HTTP 400; unauthenticated/unauthorised requests use 401/403; unique conflicts use 409. API error responses use `{ "error": "..." }`.

## Database design

The Prisma schema defines users, item reports, claims, notifications, saved items, announcements, abuse reports, and activity logs. Foreign keys, unique constraints, indexes, and workflow enums protect common invariants. Claim evidence is excluded from public report responses. Handover codes are only returned to the claimant and trusted report reviewers.

## Known limitations

- The core implementation covers auth, reporting, browsing, claims, moderation, handover, matching, and student/admin dashboards. Image uploads, saved-item and abuse-report workflows, announcement management, user suspension, and analytics charts are not complete yet.
- Local development uses a SQLite file and a fixed localhost API URL.
- JWTs expire after 24 hours; token revocation and email verification are not implemented.
- Upload storage and deployment hardening are future work.

## Future improvements

- Add validated image uploads, saved items, abuse reporting, announcement management, and richer charts.
- Expand automated API tests to cover permissions, moderation, and claim transitions.
- Add refresh/revocation strategy and production hosting configuration.

## Validation

From `backend/`: `npm run build` and `npm test`.

From `frontend/`: `npm run build` and `npm test -- --watch=false`.
