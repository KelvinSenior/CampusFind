# CampusFind API

Base URL: `http://localhost:3000/api`

Authenticated routes use an HTTP-only session cookie and a CSRF token header on state-changing requests. Request bodies are JSON. The API never accepts a client-supplied user ID or role for ownership decisions.

## Authentication

- `GET /auth/csrf` — establishes the CSRF cookie and returns its request token.
- `POST /auth/register` — validated first/last name, email, password, and terms acceptance; creates a student only.
- `POST /auth/login` — `{ "email", "password" }`; sets the session cookie.
- `POST /auth/logout` — clears the session.
- `GET /auth/me` — returns the authenticated user.
- `GET /demo/config` — exposes demo accounts only when demo mode is enabled.

## Reports and claims

- `GET /reports?q=&type=&category=&location=&status=&date=&sort=` — public approved/recovered reports with filters.
- `GET /reports/:id` — public details; pending/rejected reports are not exposed.
- `POST /reports` — authenticated student creates a pending report.
- `GET /my/reports` — authenticated user's reports.
- `PATCH /reports/:id` / `DELETE /reports/:id` — owner manages own pending/rejected reports.
- `GET /reports/:id/matches` — owner/admin gets ranked potential found-item suggestions for a lost report.
- `PATCH /reports/:id/moderate` — admin `{ "status": "APPROVED" | "REJECTED" }`.
- `POST /reports/:id/claims` — student submits ownership explanation and evidence.
- `POST /reports/:id/abuse-reports` — student submits a listing concern.
- `GET /saved-items` / `POST /saved-items/:reportId` / `DELETE /saved-items/:reportId` — student's saved listings.
- `GET /announcements` — published campus notices.
- `GET /my/claims` — claimant's claims and authorised handover code.
- `GET /reports/:id/claims` — found-report owner or admin gets claim evidence.
- `PATCH /claims/:id/review` — found-report owner or admin approves/rejects a pending claim.
- `POST /admin/claims/:id/verify-handover` — admin `{ "handoverCode" }`; marks the claim complete and report recovered.

## Notifications and dashboard

- `GET /notifications` — own notifications.
- `PATCH /notifications/:id/read` — marks an owned notification read.
- `GET /my/dashboard` — live student counts, potential matches, and recent activity.
- `GET /admin/dashboard` — live aggregate counters and recent activity for administrators.
- `GET /admin/reports?status=PENDING` / `GET /admin/claims?status=PENDING` — admin review queues.
- `GET/POST /admin/announcements`, `PATCH/DELETE /admin/announcements/:id` — administer campus notices.
- `GET /admin/abuse-reports` / `PATCH /admin/abuse-reports/:id` — review listing concerns.
- `GET /admin/users` / `PATCH /admin/users/:id/status` — list students and suspend/reactivate accounts.
- `GET /admin/activity` — recent platform activity.

## Common responses

Validation errors return 400, invalid authentication returns 401, forbidden roles return 403, missing resources return 404, duplicate records return 409, and unexpected errors return 500 with a generic message.
