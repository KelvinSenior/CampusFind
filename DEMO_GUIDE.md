# CampusFind Demonstration Guide

## Project introduction

CampusFind is a campus lost-property and recovery system. It replaces scattered messages and informal noticeboards with searchable reports, private ownership claims, moderated listings, and verified handovers.

## Problem and objectives

Students need one reliable place to report and find belongings. Finders need a consistent way to verify ownership without exposing private evidence. CampusFind provides searchable lost/found listings, role-protected review, status notifications, and an administrator-verified collection process.

## Technology and architecture

- Angular, TypeScript, Router, Reactive Forms, and HttpClient provide the client application.
- Node.js, Express, TypeScript, Zod, and cookie-based sessions provide the API.
- Prisma and PostgreSQL on Neon store users, reports, claims, notifications, saved items, announcements, abuse reports, and activity logs.
- The frontend calls the same-origin `/api` endpoints. Vercel serves the Angular build and the Express API functions from one project.
- bcrypt hashes account passwords. Student/admin permissions are enforced by the API, not by client-supplied roles.

## Database design

`User` owns reports, claims, notifications, bookmarks, and abuse reports. A `Claim` connects a student to another user's found report. The API limits public report fields so private identifying details remain restricted. `SavedItem` has a unique user/report pair. Announcements retain their administrator author. Abuse reports and activity logs are persisted with their relevant actors and entities. Prisma enums and unique constraints enforce workflow statuses and prevent duplicate claims/bookmarks.

## Demo accounts

All seeded accounts share `DEMO_PASSWORD`. The local example value in `backend/.env.example` is `CampusFind@2026`; change it before any public deployment. Configure `DEMO_MODE_ENABLED=true` to show the login chooser. In production, the API only exposes demo login details when both demo mode and an explicit `DEMO_PASSWORD` are configured.

| Role | Name | Email |
|---|---|---|
| Administrator | CampusFind Administrator | `admin@campusfind.demo` |
| Student | Daniel Mensah | `daniel@campusfind.demo` |
| Student | Ama Boateng | `ama@campusfind.demo` |
| Student | Michael Owusu | `michael@campusfind.demo` |
| Student | Grace Asante | `grace@campusfind.demo` |
| Student | Kwame Addo | `kwame@campusfind.demo` |

These are shared demonstration accounts. Visitors can alter their demo reports and other data through normal workflows. Do not mix them with sensitive user data.

## Run locally

1. Install from the repository root with `npm ci`.
2. Copy `backend/.env.example` to `backend/.env`; set valid `DATABASE_URL`, `DIRECT_URL`, and a random `JWT_SECRET` of at least 32 characters.
3. Generate the Prisma client and apply migrations with `npm run db:generate --workspace=backend` and `npm run db:migrate --workspace=backend`.
4. To seed records, set `ALLOW_DEMO_SEED=YES` for that command and run `npm run db:seed --workspace=backend`. Demo mode and `DEMO_PASSWORD` must also be configured. This is additive and idempotent; it does not reset existing records.
5. Start with `npm run dev` and open `http://localhost:4200`.

The optional non-production reset is deliberately destructive to reserved `CF-DEMO*` reports and dependent claims, bookmarks, and abuse reports. It requires `ALLOW_DEMO_RESET=YES` and `--confirm=RESET-CAMPUSFIND-DEMO`. It preserves demo user accounts and non-demo records, and refuses `NODE_ENV=production`.

## Examiner sequence (10-15 minutes)

1. **Browse (1 minute):** Open Browse, search for a laptop, and filter by category and location. Open a listing and note that private identifying evidence is not public.
2. **Register (1 minute):** Create a new student account with an unused email. Confirm registration creates a student session and opens the student dashboard.
3. **Report (2 minutes):** Submit a lost-item report. Show that it appears in the owner's dashboard as pending and not in public listings until moderation.
4. **Found listing and match (2 minutes):** Sign in as a student, submit a found report, and have an administrator approve it. Sign in as the owner of a similar lost item and open possible matches. Scores are suggestions, not ownership confirmation.
5. **Claim (2 minutes):** Sign in as a different student, open the found report, and submit private distinguishing details. Sign in as the report owner or administrator and approve or reject the claim. Show the claimant notification and approved handover code.
6. **Handover (1 minute):** As the claimant, read the code from My activity. As an administrator, enter the presented code and verify collection. Confirm the claim becomes completed and the report recovered.
7. **Student tools (1 minute):** Save a listing, view it in Saved items, remove it, then mark a notification as read and observe the unread count change.
8. **Administration (2-3 minutes):** Review the live student/report counters, moderate a pending report, publish or edit an announcement, resolve an abuse concern, suspend/reactivate a student, and inspect recent activity.

Use a separate browser profile or log out between roles. Demo accounts share records, so actions in one session are visible to other users.

## Feature audit and verification checklist

| Feature | Implementation status | Test result | Remaining issue |
|---|---|---|---|
| Registration, login, logout, session cookies, CSRF, server-assigned roles | Implemented | Backend build; route flow not integration-tested | Browser/API permission scenarios still need automated coverage |
| Student account suspension | Implemented; authentication checks current database status | Backend build only | No automated suspension/auth test yet |
| Lost/found create, edit, delete, browse, search, filters, sorting | Implemented | Frontend and backend builds | End-to-end persistence not exercised in this run |
| Match suggestions | Implemented with category, keywords, location, and date signals | 2 backend matching tests pass | API/database path not integration-tested |
| Claims, review, handover, status notifications | Implemented | Backend build only | Route permissions and full lifecycle need integration tests |
| Notifications and unread counts | Implemented; count comes from database | Builds pass | Browser state transition not exercised |
| Saved items | Implemented with unique user/report constraint and save/remove UI | Builds pass | Database mutation not exercised |
| Announcements | Public listing and administrator create/edit/publish/delete implemented | Builds pass | Database mutation not exercised |
| Abuse reporting | Student submission and administrator resolve/dismiss implemented | Builds pass | Database mutation not exercised |
| Student/admin dashboards and count chart | Database aggregate queries implemented | Builds pass | No historical/time-series chart; database response not browser-tested |
| Activity history | Seed history and runtime logging for key workflows implemented | Backend build only | Broader route-level assertions still needed |
| Image upload | Not implemented | Not tested | Current form accepts an optional external photo URL only |
| Repeatable demo seed | 40 stable report references, six accounts, claims, notices, bookmarks, abuse reports, notifications, and activity upserts implemented | TypeScript build; seed execution skipped | Database contents were not verified or populated during this run |
| Prisma migration state | Existing schema migration is current | `prisma migrate status` reported up to date | New code adds no schema migration |
| Angular production build | Implemented app compiles | Passed | None for build |
| Backend build | TypeScript compiles | Passed | None for build |
| Prisma schema validation | Schema valid | Passed | None for schema validation |
| Backend automated tests | Existing matching tests | 2 passed, 0 failed | API integration tests are not present |
| Deployed Vercel application | Same-origin API path fixed in code | Not verified | No Vercel project is linked in this workspace; deploy and test its URL |

## Current limitations

- Image uploads and managed image storage are not implemented.
- Dashboard chart bars show current database totals, not trends over time.
- Automated API permission and database integration tests are still needed.
- The production branch migration state was checked, but demonstration seeding was not run. The workspace's Neon context points at production; an isolated schema-only validation branch was created, but the seed command was skipped. No claim is made that the database currently contains the requested demo records.
- Vercel deployment and browser workflows were not verified from this workspace.

## Troubleshooting

- **Login chooser is missing:** Set `DEMO_MODE_ENABLED=true`; production also needs an explicit `DEMO_PASSWORD` in the API environment.
- **Demo login fails:** Confirm the seed completed on the database used by the API and that the browser is using that database's deployment.
- **Seed refuses to run:** Set `ALLOW_DEMO_SEED=YES`, `DEMO_MODE_ENABLED=true`, and `DEMO_PASSWORD` for that invocation. Do not set these on a production database unless intentionally publishing shared demo accounts.
- **Migration command fails:** Use the direct `DIRECT_URL` for migrations and pooled `DATABASE_URL` for application traffic; check `npm run db:generate --workspace=backend` first.
- **API requests fail on Vercel:** Confirm the Vercel project has `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, and the matching build settings. Client calls use same-origin `/api`; no local API server should be needed after deployment.
- **Student is redirected after suspension:** This is expected; suspended accounts cannot restore a session. An administrator can reactivate them.

## Presentation summary

CampusFind combines a searchable lost-and-found catalogue with private claims, moderation, persistent notifications, and verified handovers. Its workflows use PostgreSQL records and server-enforced roles. For a live defence, first complete the guarded seed against the intended demo database, configure the same `DEMO_PASSWORD` and demo-mode flag in the deployed API, then verify every account and workflow against the public Vercel URL.
