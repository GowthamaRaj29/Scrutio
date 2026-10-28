# Scrutio Investigator

Scrutio is an evidence-backed payment operations investigator. Deterministic application logic and PostgreSQL are authoritative for payment facts; optional AI is reserved for bounded evidence synthesis.

## Development

```powershell
Copy-Item .env.example .env
npm install
npm run check
```

Start local PostgreSQL with `docker compose up -d postgres`, then apply migrations using the migration tooling added in the database phase.

The payment-status path is intentionally implemented before AI integration. Its response includes `aiInvocations: 0` so tests can prove the zero-LLM invariant.
