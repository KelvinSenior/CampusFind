# CampusFind API

Base URL: `http://localhost:3000/api`

Authenticated routes accept `Authorization: Bearer <token>`. Request bodies are JSON. The API never accepts a client-supplied user ID or role for ownership decisions.

## Authentication

- `POST /auth/register` — `{ "name", "email", "password" }`; creates a student.
- `POST /auth/login` — `{ "email", "password" }`; returns `{ "token", "user" }`.
- `GET /auth/me` — returns the authenticated user.

## Reports and claims

- `GET /reports?q=&type=&category=&location=&status=&date=&sort=` — public approved/recovered reports with filters.
- `GET /reports/:id` — public details; pending/rejected reports are not exposed.
- `POST /reports` — authenticated student creates a pending report.
- `GET /my/reports` — authenticated user's reports.
- `PATCH /reports/:id` / `DELETE /reports/:id` — owner manages own pending/rejected reports.
- `GET /reports/:id/matches` — owner/admin gets ranked potential found-item suggestions for a lost report.
- `PATCH /reports/:id/moderate` — admin `{ "status": "APPROVED" | "REJECTED" }`.
- `POST /reports/:id/claims` — student submits ownership explanation and evidence.
- `GET /my/claims` — claimant's claims and authorised handover code.
- `GET /reports/:id/claims` — found-report owner or admin gets claim evidence.
- `PATCH /claims/:id/review` — found-report owner or admin approves/rejects a pending claim.
- `POST /admin/claims/:id/verify-handover` — admin `{ "handoverCode" }`; marks the claim complete and report recovered.

## Notifications and dashboard

- `GET /notifications` — own notifications.
- `PATCH /notifications/:id/read` — marks an owned notification read.
- `GET /admin/dashboard` — live aggregate counters for administrators.
- `GET /admin/reports?status=PENDING` / `GET /admin/claims?status=PENDING` — admin review queues.

## Common responses

Validation errors return 400, invalid authentication returns 401, forbidden roles return 403, missing resources return 404, duplicate records return 409, and unexpected errors return 500 with a generic message.
