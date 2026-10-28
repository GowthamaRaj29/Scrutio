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
