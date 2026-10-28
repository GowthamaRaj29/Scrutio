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

## Operational data foundation verification — 2026-10-28

`npm run migrate` passed and applied `004_operational_data.sql` and
`005_investigation_membership_integrity.sql` to the existing PostgreSQL
database without deleting the existing volume or data.

`npm run test:integration` passed:

- 3 PostgreSQL integration tests passed.
- Operational tables and RLS policies were available after migration.
- Composite foreign keys rejected a cross-tenant webhook-to-payment relationship.
- Composite membership foreign keys rejected a cross-tenant investigation requester.
- Invalid cross-tenant test data was isolated with a savepoint and did not abort the transaction.
- Investigation results persisted and round-tripped with rule-set version, status, timestamp,
  fingerprint, result, and tenant scope.
- Cross-tenant investigation retrieval returned no result.
- Existing authentication and payment RLS tests continued to pass.

The clean-database migration run remains to be performed in an isolated PostgreSQL container;
the existing development database verification does not substitute for that evidence.

## Protected investigation API verification — 2026-10-28

`npm run check` passed:

- Prettier formatting, ESLint with zero warnings, strict TypeScript, 11 unit tests, and production build.

`npm run test:integration` passed:

- 3 PostgreSQL integration tests passed.
- Unauthenticated investigation creation returned `401`.
- Authenticated creation for the session organization returned `201`.
- Missing order and webhook evidence produced a persisted `PARTIAL` investigation rather than a false complete result.
- Persisted investigation retrieval succeeded for the owning organization.
- A URL organization override returned `403`; no tenant identity was accepted from the request body.
- Existing authentication, payment RLS, and operational-data tests continued to pass.

`npm audit --omit=dev` passed with 0 vulnerabilities.

Limitations: the current API exposes only the supported payment/order/webhook evidence slice;
viewer-specific role coverage, frontend E2E tests, cache invalidation/single-flight tests, and
the optional AI boundary remain future phases.

## Operational ingestion verification — 2026-10-28

The authenticated PostgreSQL integration flow now verifies:

- Tenant-scoped order ingestion updates the authoritative order and linked payment.
- Tenant-scoped webhook ingestion succeeds only for the authenticated organization.
- Repeating the same webhook event is idempotent.
- Existing event IDs with conflicting payloads are rejected.
- Successful order and webhook commits invalidate the shared payment-status cache after commit.
- The investigation created after ingestion reflects available order and webhook evidence and
  returns `COMPLETED`; missing-source cases remain truthfully `PARTIAL`.

Ledger, settlement, and external provider ingestion are still not implemented.

## Ledger ingestion verification — 2026-10-28

The PostgreSQL integration flow now verifies:

- Balanced debit/credit lines using exact decimal-to-cents arithmetic are accepted.
- Unbalanced entries return `409` and leave no partial ledger rows.
- Repeated source events are rejected without duplicate ledger postings.
- Concurrent duplicate protection is backed by the organization-scoped PostgreSQL unique
  constraint on `source_event_id`, not an in-memory map.
- Currency mismatches are rejected before persistence.
- Account and payment references remain tenant-scoped through RLS and composite foreign keys.
- Successful ledger writes update payment ledger presence and invalidate the payment cache after
  commit.

The current schema models one ledger entry account plus journal lines. Multi-account posting,
settlement reconciliation, and richer reversal workflows remain outside the verified slice.

## Settlement ingestion verification — 2026-10-28

The PostgreSQL integration flow verifies:

- Authenticated settlement ingestion is tenant-scoped.
- Settlement records can link only to payments in the same organization.
- Settlement and payment currencies must match.
- Identical source-event retries are idempotent.
- Conflicting reuse of a source event is rejected.
- Settlement creation and payment-link insertion share one transaction.
- Failed validation does not leave a settlement or relationship rows.

The current schema stores settlement totals and links but has no per-payment allocation amount or
reconciliation-status field. The implementation therefore records observed provider relationships
without claiming that a settlement is financially reconciled.

## Provider history verification — 2026-10-28

The PostgreSQL integration flow verifies:

- Authenticated provider payment-event ingestion is tenant-scoped.
- Provider event identifiers are preserved with their observed status and timestamp.
- Repeated provider event IDs are rejected by the database-backed uniqueness constraint.
- Payment references must belong to the authenticated organization through the composite foreign key.
- Provider history is loaded into normalized investigation evidence from PostgreSQL.
- Provider-event writes invalidate the payment-status cache only after commit.

No external provider calls, polling worker, raw provider payload storage, or AI processing were
introduced. Provider history remains observed source data; R060 uses authoritative payment
references rather than copying references from provider-event history.

## R060 verification — 2026-10-28

The R060 implementation is verified against the authoritative specification:

- The trigger is `COUNT(DISTINCT payments WHERE provider_reference_id = R) > 1`.
- Comparison is scoped to the organization; provider names do not partition references.
- Missing references produce `INSUFFICIENT_EVIDENCE`, not a finding.
- Unique references produce `NO_MATCH`.
- Duplicate references produce a deterministic CRITICAL finding with stable payment evidence IDs.
- Payment references are persisted through an authenticated tenant-scoped path and cannot be overwritten.
- Live PostgreSQL tests verify migration compatibility, RLS/tenant ownership, duplicate references,
  different providers sharing a reference, and investigation result evidence.

The migration leaves provider metadata nullable for legacy payment rows because no authoritative
provider value can be reconstructed for existing records.

## Detection-rule coverage audit — 2026-10-28

`RULE_COVERAGE_AUDIT.md` compares every specification rule R001-R063 with the actual
`InvestigationEngine`, normalized evidence schema, PostgreSQL source query, migrations, and
tests. It identifies four directly verified rules (R001, R005, R012, and R060), coded but
under-tested rules, the R020/R021/R039/R041 identifier mismatch, evidence-query gaps, and rules
that require absent authoritative fields or external state. This audit does not claim full
63-rule coverage.

## Cache correctness and concurrency verification — 2026-10-28

`npm run check` passed:

- Formatting, ESLint with zero warnings, strict TypeScript, 17 unit tests, and production build.

Cache tests verified:

- TTL expiry triggers a fresh authoritative lookup.
- Concurrent identical requests share one lookup for the same organization and payment.
- Identical payment IDs in different organizations do not share in-flight work.
- Failed lookups are removed and never cached as valid responses.
- Successful mutation invalidation prevents a stale pre-invalidation read from repopulating the cache.
- In-flight state remains bounded when distinct-key load exceeds the configured limit.

The application now constructs one shared `PaymentStatusService`, rather than one service per
request, so single-flight deduplication applies across concurrent API requests. The current
repository has no production payment mutation endpoint; `invalidateAfterMutation` is the
post-commit hook for future authoritative write paths. No cross-process latency or invalidation
claim was made.
