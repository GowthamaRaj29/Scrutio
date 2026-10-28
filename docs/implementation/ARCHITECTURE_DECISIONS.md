# Architecture decisions

## Authentication and authorization

- Authentication is database-backed and uses the existing PostgreSQL service; no paid identity provider or additional runtime service is required.
- Passwords are hashed with Node.js `crypto.scrypt` using a random 128-bit salt. The encoded hash stores the cost parameters and derived key, never the password.
- Sessions use 256-bit random bearer tokens. Only a SHA-256 token digest is stored in PostgreSQL. Sessions expire after eight hours and can be revoked server-side.
- The session cookie is `HttpOnly`, `SameSite=Lax`, path-scoped to `/`, and `Secure` in production. Browser local storage is not used.
- Login errors intentionally use the same response for unknown, disabled, and incorrect credentials. A process-local limiter allows five attempts per email/IP key per fifteen minutes; this is not a distributed limiter.
- The authenticated session stores the selected organization membership and role. Payment URLs are treated as untrusted: the URL organization must equal the session organization before the database transaction starts.
- PostgreSQL transaction-local `app.organization_id` remains the final tenant boundary. The runtime role is `NOSUPERUSER` and `NOBYPASSRLS`.
- Security audit events record event type and identifiers only. Passwords, raw tokens, cookies, and credentials are excluded.

Registration, password recovery, social login, and distributed rate limiting are intentionally outside this phase.
