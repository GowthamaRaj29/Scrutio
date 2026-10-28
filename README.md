# Scrutio Investigator

Scrutio is an evidence-backed payment operations investigator. Deterministic application logic and PostgreSQL are authoritative for payment facts; optional AI is reserved for bounded evidence synthesis.

## Development

```powershell
Copy-Item .env.example .env
npm install
npm run check
```

Start local PostgreSQL with `docker compose up -d postgres`, then apply migrations using the migration tooling added in the database phase.

The application uses the least-privilege `scrutio_app` role. `DATABASE_ADMIN_URL` and `DATABASE_APP_PASSWORD` are only for migrations; never use the administrative connection string in application runtime configuration. The migration runner creates or updates the role without storing its password in the repository.

With Docker running, the PostgreSQL verification workflow is:

```powershell
docker compose up -d postgres
docker compose ps
npm run migrate
npm run test:integration
npm run check
docker compose stop postgres
```

The Compose file uses a named `scrutio-postgres` volume. Stopping the service preserves the database; do not remove the volume unless the database is intentionally being destroyed. Use `docker system df` before any Docker cleanup.

The payment-status path is intentionally implemented before AI integration. Its response includes `aiInvocations: 0` so tests can prove the zero-LLM invariant.

Authentication is database-backed. Login creates an expiring server-side session whose token is stored only as a hash; protected payment requests derive tenant context from that session and PostgreSQL RLS. Run `npm run migrate` before starting the API.

The deterministic investigation engine currently evaluates validated payment, optional order, and optional webhook evidence without AI calls. See `docs/implementation/INVESTIGATION_SCENARIO_MATRIX.md` for verified coverage and blocked rule families.

Migrations `004_operational_data.sql` and `005_investigation_membership_integrity.sql` add
tenant-isolated operational source tables and durable investigation result storage. They are
applied by `npm run migrate` and do not delete existing data.

Authenticated analysts, admins, and owners can create investigations with:

```text
POST /api/v1/organizations/:organizationId/investigations
{"paymentId":"PAYMENT-123"}
```

The organization is derived from the session and the URL must match it. Results are retrieved
with `GET /api/v1/organizations/:organizationId/investigations/:investigationId`. Investigation
creation is deterministic and database-backed; missing source evidence is reported as `PARTIAL`.

Authenticated organization members can ingest authoritative order and webhook evidence through:

```text
POST /api/v1/organizations/:organizationId/orders
POST /api/v1/organizations/:organizationId/webhooks
```

Order ingestion upserts the organization-scoped order and optionally links it to an existing
payment. Webhook ingestion is idempotent by organization and event ID and rejects conflicting
re-deliveries. Successful commits invalidate the in-process payment-status cache. The current
implementation does not claim cache invalidation across multiple API processes.

Ledger entries can be ingested through:

```text
POST /api/v1/organizations/:organizationId/ledger/entries
```

The payload requires a tenant-scoped `sourceEventId`, an existing account, optional payment,
exact-decimal entry amount/currency, and at least one debit and credit journal line. Debit and
credit totals must balance exactly with the entry amount and use the same currency. PostgreSQL
uniqueness prevents duplicate source postings; failed or conflicting transactions do not leave
partial ledger history.

Settlement records and payment relationships can be ingested through:

```text
POST /api/v1/organizations/:organizationId/settlements
```

The request includes a tenant-scoped `sourceEventId`, settlement amount/currency/status/date, and
an optional list of payment IDs. Repeating an identical source event is idempotent; conflicting
reuse is rejected. Payment links must belong to the authenticated organization and use the
settlement currency. Because the current schema has no allocation amount or reconciliation-status
field, this endpoint records observed provider relationships and does not claim financial
reconciliation.
