# Scrutio Investigator

Scrutio is an evidence-backed payment operations investigator. Deterministic application logic and PostgreSQL are authoritative for payment facts; optional AI is reserved for bounded evidence synthesis.

## Development

```powershell
Copy-Item .env.example .env
npm install
npm run check
```

Start local PostgreSQL with `docker compose up -d postgres`, then apply migrations using the migration tooling added in the database phase.

The application uses the least-privilege `scrutio_app` role. `DATABASE_ADMIN_URL` is only for migrations; never use the administrative connection string in application runtime configuration. The role is created by `database/init/01-create-app-role.sql` on a new named volume.

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
