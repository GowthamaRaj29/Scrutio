# Test status

## Baseline

The repository contained only prompt documents and no application, test, build, or CI configuration. No pre-existing checks were available to run.

## Current

Run after dependency installation:

```text
npm run check
```

The exact output and any blockers must be recorded here after execution.

## Foundation verification — 2026-10-28

`npm run check` passed:

- Prettier formatting: passed
- ESLint with zero warnings: passed
- TypeScript strict type-check: passed
- Unit tests: 3 passed, 0 failed
- Production TypeScript build: passed

Additional checks:

- `npm audit`: 0 vulnerabilities
- `npm audit --omit=dev`: 0 vulnerabilities
- API smoke check: `GET /health` returned `{"status":"ok"}`

PostgreSQL integration and migration execution require a live PostgreSQL `DATABASE_URL`; the integration test skips explicitly when it is absent. Authentication, E2E tests, dependency scanning in CI, and frontend tests remain pending.

## PostgreSQL verification — 2026-10-28

- Docker Desktop engine: healthy
- `docker compose up -d postgres`: passed
- PostgreSQL healthcheck: healthy
- `npm run migrate`: passed
- Application role: `scrutio_app`, verified non-superuser and non-bypass-RLS
- `npm run test:integration` with admin migration URL and app runtime URL: passed
- Positive tenant lookup: passed
- Negative cross-tenant lookup: passed
- Fresh empty-database bootstrap verification: passed in an isolated PostgreSQL 17 container on port 15432
- Fresh bootstrap applied `001_initial.sql` and `002_app_role_grants.sql`; RLS was enabled and forced; `scrutio_app` was verified non-superuser and non-bypass-RLS
- Fresh bootstrap role creation is migration-managed and does not require committed credentials or a platform-specific init script.
- The local `.env` contains a credential value that must be rotated before any external AI integration is enabled; it is ignored by Git and was not committed.

## Authentication verification — 2026-10-28

`npm run check` passed:

- Prettier formatting, ESLint, strict TypeScript, 5 unit tests, and production build.

`npm run migrate` passed:

- Applied `003_authentication.sql` to the local PostgreSQL database.

`npm run test:integration` passed:

- 2 PostgreSQL integration tests passed.
- Password hashes are verified using Node.js `crypto.scrypt`; plaintext passwords are not stored.
- Valid, invalid, expired, and revoked sessions were exercised.
- Authenticated payment lookup succeeded only for the session organization.
- A URL organization override returned `403`.
- Logout invalidated subsequent protected requests.
- Transaction-local tenant context was cleared between pooled connections.
- Login rate limiting and security audit writes were exercised.

Limitations: login limiting is process-local and therefore not a distributed deployment control; registration, recovery, and role-specific administrative endpoints are not part of this phase.

## Deterministic investigation verification — 2026-10-28

Targeted command:

```text
npx tsx --test apps/api/src/services/investigation-engine.test.ts
```

Result: 6 passed, 0 failed.

Verified behaviors:

- SC-01 payment/order/ledger mismatch findings.
- Inclusive threshold and below-threshold behavior.
- Missing evidence produces `INSUFFICIENT_EVIDENCE`, not a confirmation.
- Unverified processed webhook detection.
- Stable rule ordering and repeatable output for identical inputs.
- Malformed amounts and timestamps are rejected.

The complete 63-rule matrix is not complete because the current database has no authoritative
orders, webhook events, ledger entries, journal lines, settlements, or pattern aggregate schemas.
