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

## Deterministic investigation engine

- Rule evaluation is a pure application boundary over validated evidence; it does not call an AI provider.
- Evidence is normalized with Zod before evaluation. Missing optional sources produce `INSUFFICIENT_EVIDENCE`; they are never interpreted as false or zero.
- Rule IDs and the rule-set version are present on every evaluation and finding. Findings and evidence references use stable lexical ordering.
- Thresholds are typed environment configuration with validated defaults, not scattered literals in rule conditionals.
- The engine currently supports the payment/order/webhook evidence available to the repository. Rules requiring authoritative order, webhook, ledger, settlement, and pattern tables remain blocked until those schemas are added.

## Operational data foundation

- Operational records are tenant-scoped and use PostgreSQL RLS in addition to composite foreign
  keys that prevent relationships from crossing organizations.
- Investigation requesters use a composite foreign key to organization membership, preventing a
  valid user from being recorded as the requester for another organization.
- Monetary values use `NUMERIC(18,2)` and currencies are stored explicitly. Event identifiers and
  organization-scoped business identifiers are unique to support replay-safe ingestion later.
- Investigation results are stored as structured JSON plus normalized findings and evidence
  references. Missing upstream evidence is represented by the persisted status/result rather than
  fabricated source records.
- Upstream ingestion, settlement reconciliation, and customer/payment-method aggregation remain
  outside this phase because their source semantics are not implemented in the repository.

  ## Payment-status cache consistency
  - Payment-status cache keys contain the organization ID and payment ID; the cache is never consulted
    before the authenticated route has checked the session organization.
  - The cache is bounded by a configurable maximum entry count and TTL. Expired entries are removed
    on access, and least-recently-used entries are evicted when the bound is reached.
  - A shared `PaymentStatusService` performs tenant-scoped single-flight lookups. Failed lookups are
    not cached, completed requests are removed promptly, and a maximum in-flight count prevents
    unbounded promise retention under overload.
  - Successful authoritative mutations must call `invalidateAfterMutation` only after their database
    transaction commits. Invalidation advances a version so a read that began before the mutation
    cannot repopulate the cache with stale data. There is currently no production payment mutation
    endpoint; this hook is the required boundary for future ingestion/write paths.
  - In-process invalidation is process-local. Multiple API replicas would require a durable
    invalidation mechanism or a conservative cache bypass; this implementation does not claim
    cross-process cache consistency.

  ## Deployment architecture

  Scrutio remains a modular monolith. Authentication, payment status, ingestion, investigation
  orchestration, deterministic rules, persistence, and HTTP controllers share one process and one
  tenant-scoped PostgreSQL authority. No current workload has demonstrated independent scaling,
  failure-isolation, or latency requirements that justify a second service, broker, Redis instance,
  or container orchestration layer. The ingestion service is kept behind an application boundary so
  an independently deployed worker can be introduced later if measured throughput or retry pressure
  requires it, without changing the domain contracts.
