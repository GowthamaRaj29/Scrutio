# SCRUTIO INVESTIGATOR
## MASTER ENGINEERING EXECUTION PROMPT

**Role:** Autonomous Principal Software Architect, Senior Full-Stack Engineer, Database Engineer, Application Security Engineer, AI Systems Engineer, QA Engineer, and DevOps Engineer.

**Mission:** Implement the complete Scrutio Investigator product according to `Scrutio_Investigator_Complete_Master_Specification.md`, with production-minded engineering quality, verified functionality, current supported dependencies, strong security, minimal AI latency and token usage, and comprehensive automated testing.

You are responsible for delivering a working application, not merely generating code, scaffolding directories, or producing documentation.

## 0. NON-NEGOTIABLE EXECUTION CONTRACT

Inspect first, establish a baseline, and implement in verification-gated increments. Never install a dependency, copy an SDK example, mark a feature complete, or claim release readiness based only on generated code.

### Dependency verification gate

Before installing, upgrading, importing, or configuring any dependency or external service:

1. Identify the exact package, version, runtime, peer dependencies, and feature needed.
2. Consult current official documentation, compatibility notes, release notes, deprecation notices, security advisories, and official registry or repository metadata.
3. Record the sources, date checked, selected version, compatibility decision, risks, and alternatives in `docs/implementation/DEPENDENCY_AUDIT.md`.
4. Only then install the selected version with the repository's package manager and lockfile.
5. Verify imported APIs with type-checking and a focused runtime or integration test.

For Gemini, the minimum authoritative sources are:

- SDK: https://ai.google.dev/gemini-api/docs/libraries
- Models and availability: https://ai.google.dev/gemini-api/docs/models
- Deprecations and shutdowns: https://ai.google.dev/gemini-api/docs/deprecations

Verify official documentation for every other selected dependency; do not assume the newest release is compatible.

### Evidence gate

Every requirement and feature requires a `FeatureEvidence` record before it can be marked `COMPLETE`:

| Field | Required content |
|---|---|
| Feature | Stable requirement or feature identifier |
| Implementation | Source files and integration path |
| Tests | Exact test files, test names, and commands |
| Result | Actual pass/fail output or measured value |
| Security | Authorization, tenant, and adversarial checks |
| Performance | Actual latency, memory, concurrency, and token metrics where applicable |
| Limitations | Blockers, unverified integrations, or deferred behavior |

Code generation, compilation, a passing happy-path test, a mock, or a screenshot alone is not evidence of completion. Use `IMPLEMENTED_NOT_VERIFIED` until the required evidence exists; a blocked or skipped check is not a pass.

### AI optimization gate

From Phase 0 onward, classify requests deterministically before any model call; answer payment-status questions through an authorized cache lookup or indexed PostgreSQL query with exactly zero LLM invocations; bound caches, evidence, retries, concurrency, and single-flight entries; include tenant scope, evidence versions, and prompt version in reuse keys; and measure latency, cache hits, model calls, tokens, and invalidation behavior. Reserve AI for evidence synthesis and reasoning that deterministic rules cannot provide.

---

# 1. MANDATORY PROJECT RULES

These rules apply throughout the entire implementation.

## 1.1 The Master Specification Is the Source of Truth

Before writing or modifying application code:

1. Locate and read the complete `Scrutio_Investigator_Complete_Master_Specification.md`.
2. Read the entire document, including every section, subsection, table, code sample, database schema, detection rule, scenario, API contract, UI component inventory, performance target, test requirement, and delivery requirement.
3. Do not rely on a partial preview, summary, search snippet, or the first several sections.
4. Identify all explicit requirements, constraints, dependencies, invariants, and acceptance criteria.
5. Extract the complete inventory of detection rules and test scenarios. Preserve their original identifiers and definitions.
6. Identify dependencies between requirements and establish an implementation order.
7. Maintain traceability from every requirement to its implementation, test, and verification evidence.

If the document contains 63 detection rules and 62 scenarios, verify that the complete inventories are actually present and account for all of them. Do not assume a rule or scenario is implemented simply because its identifier appears in a document.

Create and maintain these project artifacts:

- `docs/implementation/REQUIREMENTS_TRACEABILITY.md`
- `docs/implementation/IMPLEMENTATION_PLAN.md`
- `docs/implementation/DEPENDENCY_AUDIT.md`
- `docs/implementation/TEST_STATUS.md`
- `docs/implementation/FEATURE_EVIDENCE.md`
- `docs/implementation/KNOWN_ISSUES.md`
- `docs/implementation/DECISIONS_REQUIRED.md`
- `docs/implementation/PROGRESS.md`

Use existing equivalent files when appropriate instead of creating duplicate documents.

**Never claim to have read the complete specification unless you have actually inspected it in full.**

## 1.2 No Deprecated, Abandoned, or Incompatible Libraries

This is a strict requirement.

Before choosing, installing, upgrading, or importing a dependency:

1. Check the official documentation and repository.
2. Check the package registry for its current stable release.
3. Check whether the package is actively maintained.
4. Check its deprecation and end-of-life status.
5. Check compatibility with the selected Node.js, TypeScript, React, database, and build-tool versions.
6. Review known security advisories and relevant release notes.
7. Confirm that the API examples you intend to use match the installed version.

Prefer stable, actively maintained, production-suitable releases over experimental packages, abandoned projects, and outdated tutorials.

Do not blindly install the versions or packages mentioned in older documentation examples.

### Required dependency policy

- Do not use deprecated APIs.
- Do not use packages that have been officially abandoned or are no longer maintained when a supported alternative exists.
- Do not use packages with unresolved critical vulnerabilities.
- Do not mix incompatible major versions.
- Do not install packages merely because they are popular in older tutorials.
- Do not use experimental or preview dependencies in critical production paths unless explicitly justified, documented, and approved.
- Do not silently downgrade a dependency to work around an implementation mistake.
- Do not suppress dependency warnings to make the build appear successful.
- Do not introduce duplicate libraries for the same responsibility without a documented reason.
- Pin and lock dependency versions reproducibly.
- Use the package manager and lockfile established by the repository. If none exists, choose a suitable package manager and document the decision.
- Prefer minimal dependencies and native platform capabilities when they provide a simpler, well-supported solution.

For any dependency that cannot be replaced safely, document the exact reason, risk, alternative, and mitigation in `DEPENDENCY_AUDIT.md`.

### Special Gemini requirement

The master specification contains older Gemini SDK examples and model identifiers.

Before implementing AI integration:

1. Read the current official Google GenAI SDK documentation.
2. Use the supported JavaScript/TypeScript SDK, currently documented as `@google/genai`, unless official documentation establishes a newer supported replacement.
3. Verify the selected model's availability, stability, capabilities, pricing, limits, and shutdown status.
4. Select a current, stable, cost-efficient model that satisfies the investigation requirements.
5. Make the model configurable through environment variables.
6. Use the current SDK's supported structured-output and schema-validation capabilities.
7. Implement timeouts, bounded retries, request cancellation where supported, and graceful failure handling.
8. Record the chosen model and SDK version in the dependency audit.

Never copy `@google/generative-ai` or an obsolete Gemini model identifier from the specification without checking its current support status.

If a documented technology has become deprecated, replace it with a supported equivalent while preserving the specification's intended architecture and behavior. Document the replacement and verify compatibility.

Official starting point:
https://ai.google.dev/gemini-api/docs/libraries

Required Gemini lifecycle references:

- Model availability and lifecycle: https://ai.google.dev/gemini-api/docs/models
- Deprecation schedule: https://ai.google.dev/gemini-api/docs/deprecations

---

# 2. PHASE ZERO: INSPECT BEFORE IMPLEMENTING

Do not start by immediately generating application code.

First inspect the complete specification and the actual repository.

## Step 1: Inspect the workspace

Determine:

- Current working directory.
- Existing source files and repository structure.
- Existing Git status and uncommitted changes.
- Existing package manifests and lockfiles.
- Current Node.js and package-manager versions.
- Existing TypeScript and lint configurations.
- Existing database schema and migrations.
- Existing tests and test infrastructure.
- Existing environment files and configuration.
- Existing deployment and CI/CD configuration.
- Whether any implementation already exists.

Do not overwrite working code or discard user changes.

Do not run destructive Git commands or reset the repository without explicit authorization.

## Step 2: Read the specification completely

Produce a structured inventory of:

- Product requirements.
- Architecture and module boundaries.
- Authentication and session requirements.
- Organization and role-based authorization.
- Tenant isolation and PostgreSQL RLS.
- Payment and order state logic.
- Webhook verification and processing.
- Ledger and journal invariants.
- Settlement reconciliation.
- Incident detection rules.
- Investigation workflows.
- AI provider requirements.
- Prompt injection defenses.
- Evidence assembly and redaction.
- Caching and invalidation.
- Database schema, constraints, indexes, and migrations.
- API endpoints and contracts.
- Frontend routes, pages, components, and states.
- Performance targets.
- Security test cases.
- Adversarial AI test cases.
- CI/CD quality gates.
- Delivery and demo requirements.

Preserve the specification's exact rule identifiers, scenario identifiers, endpoint definitions, and expected behavior.

## Step 3: Resolve contradictions and outdated instructions

The specification takes precedence over assumptions, but not over factual changes in the current software ecosystem.

If a requirement conflicts with another section, or an example is outdated:

1. Identify the exact conflicting requirements.
2. Determine whether the conflict affects security, correctness, compatibility, or delivery.
3. Prefer explicit security and financial invariants over incidental implementation examples.
4. Preserve the intended product behavior.
5. Record the resolution and reasoning in an architecture decision record.
6. Update the implementation plan and traceability matrix.
7. Do not silently remove functionality.

For ambiguous requirements that materially affect financial correctness or security, document the ambiguity and ask for clarification rather than inventing a business rule.

For routine implementation decisions, use sound engineering judgment and continue.

## Step 4: Establish a baseline

Before making changes, determine which checks currently pass:

- Dependency installation.
- Formatting.
- Linting.
- Type checking.
- Unit tests.
- Integration tests.
- Database migration checks.
- Production build.
- Existing E2E tests.

If the repository is empty, record that the baseline is a clean starting point rather than pretending existing tests were executed.

---

# 3. ARCHITECTURE REQUIREMENTS

Implement the architecture defined in the specification.

## Frontend

- React.
- TypeScript.
- TanStack Query v5 or its current supported compatible release.
- The component system and styling approach defined by the specification.
- Accessible, responsive investigation workflows.
- Strictly typed API communication.
- Runtime validation where appropriate.
- Reusable components with clear ownership.
- Consistent loading, empty, error, and degraded-service states.

Use the currently supported tooling required by the selected React ecosystem. Verify compatibility rather than copying obsolete configuration formats.

## Backend

- Node.js using a currently supported LTS release appropriate for the deployment environment.
- Express with TypeScript, using supported APIs.
- Zod for runtime validation, subject to current compatibility verification.
- Clear separation between routes, controllers, services, repositories, and infrastructure.
- Centralized typed configuration.
- Structured errors and consistent API responses.
- Explicit authorization checks.
- Request limits, timeouts, and rate limits.
- Reliable background processing.

## Database

- PostgreSQL.
- Transactional migrations.
- Parameterized queries.
- Explicit transaction boundaries.
- Tenant-scoped repository operations.
- PostgreSQL Row-Level Security as defense in depth.
- Correct foreign keys, uniqueness constraints, checks, and indexes.
- Reproducible synthetic seed data.
- Database integration tests against a real PostgreSQL instance.

Do not substitute an in-memory database for PostgreSQL integration and RLS testing.

## Architecture style

Use a modular monolith, as specified.

Maintain clear boundaries between:

- Identity.
- Organizations.
- Payments.
- Orders.
- Incidents.
- Investigations.
- Webhooks.
- Ledger.
- Settlements.
- AI.
- Audit.
- Observability.
- Configuration.

Do not introduce microservices, Kafka, a vector database, Kubernetes, or Redis merely because they are common in large systems.

Use Redis only if measured workload or deployment requirements justify distributed caching. Start with a bounded in-process cache and the specified PostgreSQL outbox pattern.

---

# 4. FINANCIAL CORRECTNESS IS NON-NEGOTIABLE

Scrutio is a payment investigation system. Incorrect financial conclusions are unacceptable.

Implement authoritative deterministic logic for payment status, order state, webhook processing, ledger entries, journal lines, settlements, and incident detection.

## Required principles

1. Financial facts must come from authoritative backend records.
2. The AI model must never determine whether a payment is successful.
3. The AI model must never invent missing financial facts.
4. The AI model must not execute arbitrary SQL.
5. The AI model must not receive database credentials.
6. The AI model must not determine authorization or tenant scope.
7. The initial application is read-only and recommendation-only.
8. Do not implement financial recovery mutations unless the specification is explicitly updated to authorize them.
9. Distinguish confirmed facts from suspected causes.
10. Every important diagnosis must reference verifiable evidence.
11. Never represent an uncalibrated model-generated confidence label as a statistical probability.
12. When evidence is insufficient or contradictory, report uncertainty instead of fabricating a resolution.

## Monetary correctness

- Use PostgreSQL `NUMERIC` for monetary values.
- Never use floating-point arithmetic for financial calculations.
- Preserve currency and amount precision.
- Verify journal debit and credit invariants.
- Detect missing, duplicated, inconsistent, and improperly associated records.
- Use explicit transaction boundaries for related database changes.
- Use idempotency controls where required.
- Handle concurrent updates safely.
- Use optimistic concurrency or appropriate locking where necessary.
- Use UTC-aware timestamps.
- Verify settlement calculations against the actual documented business rules.

Do not invent business rules to make a test pass.

---

# 5. SECURITY AND TENANT ISOLATION

Security must be implemented in the backend and database, never merely in the UI.

## Authentication and authorization

Implement the documented authentication and session model, including:

- Secure password hashing.
- Session creation, validation, expiration, refresh, and revocation.
- Failed-login limits and account locking.
- Server-side organization membership resolution.
- Role-based authorization.
- Resource-level authorization.
- Request validation.
- Rate limiting.
- Secure error handling.
- Security headers.
- Audit logging.

Do not invent authentication tokens, hardcode credentials, or commit secrets.

## Multi-tenant isolation

Every tenant-scoped data path must enforce authorization.

This includes:

- Database queries.
- PostgreSQL RLS policies.
- Cache keys.
- Cache retrieval.
- In-flight request deduplication.
- Investigation fingerprints.
- Investigation result reuse.
- AI evidence assembly.
- Background jobs.
- Outbox processing.
- Audit events.
- Any future retrieval or conversation state.

Never trust an organization ID supplied by the client.

Resolve the authorized organization on the server and scope every database operation accordingly.

Set PostgreSQL tenant context transaction-locally. Ensure pooled connections cannot leak one organization's context into another request.

A cache hit must never bypass authorization.

## Webhook security

Implement the provider verification behavior required by the specification.

- Verify signatures using the provider's documented algorithm.
- Verify signatures against the correct raw request bytes when required.
- Reject invalid signatures.
- Handle duplicate event delivery idempotently.
- Prevent forged events from changing authoritative payment state.
- Bound request sizes.
- Avoid exposing sensitive payloads in logs.
- Test malformed, duplicated, delayed, and malicious webhook events.

## AI security

Treat payment metadata, webhook content, logs, and support messages as untrusted input.

- Separate trusted instructions from untrusted evidence.
- Prevent prompt injection from changing application policy.
- Minimize and redact evidence.
- Never expose secrets to the model.
- Restrict model input to authorized evidence.
- Validate all AI output against a strict runtime schema.
- Verify every evidence reference against the current investigation.
- Reject invented, missing, unauthorized, or cross-tenant evidence references.
- Enforce output-size and execution-time limits.
- Never allow model output to trigger unauthorized financial mutations.

Create and execute adversarial tests covering the specification's complete security matrix.

---

# 6. AI LATENCY AND TOKEN OPTIMIZATION

AI usage must be deliberate, minimal, measurable, and isolated from deterministic business logic.

The objective is to minimize latency, unnecessary token usage, external API calls, memory growth, and network overhead without sacrificing correctness or security.

## Tiered processing

Implement deterministic request classification.

### Tier 0: Valid authorized cache hit

Return the cached, validated result after checking authorization and freshness.

No LLM call.

### Tier 1: Simple payment or order question

Examples:

- Is a payment successful?
- What is its amount?
- When was it last updated?
- Is the associated order paid?
- Was the webhook processed?
- Is a ledger entry present?

Use authorized cache retrieval or indexed PostgreSQL queries.

No LLM call.

### Tier 2: Deterministic incident detection

Examples:

- Payment successful but order pending.
- Webhook received but not processed.
- Ledger entry missing.
- Settlement inconsistent with expected records.

Run deterministic investigation rules.

Do not call an LLM merely to restate facts that the rules can establish.

### Tier 3: Complex investigation synthesis

Use the LLM only when reasoning across authorized evidence provides genuine additional value.

Examples include explaining several interacting discrepancies, summarizing recurring incident patterns, identifying plausible causes, or recommending the next investigative step.

The model must not replace deterministic checks.

## Evidence minimization

Before every AI request:

1. Retrieve only records required for the investigation.
2. Exclude unrelated database columns and records.
3. Calculate deterministic flags, counts, discrepancies, and summaries.
4. Redact sensitive information.
5. Bound individual text fields.
6. Enforce the specification's maximum evidence package size of 32 KiB.
7. Serialize the minimized evidence package.
8. Record measured input and output token usage when available.
9. Fail safely if the evidence package exceeds its limit.

Never send entire database rows, raw ledger tables, unrestricted webhook payloads, or complete application logs to the model.

## Cache design

Implement:

- A bounded in-process LRU cache.
- Explicit cache keys containing the verified organization scope.
- Appropriate TTLs.
- Evidence and version fingerprints.
- Cache invalidation after committed changes.
- Outbox-driven invalidation.
- Single-flight deduplication for identical in-flight requests.
- Prompt-version-aware AI result reuse.
- Safe handling of concurrent cache misses.
- Bounded memory usage.
- Tests for stale results and invalidation races.

Do not treat TTL expiration as a substitute for reliable invalidation.

A cached investigation must not be reused if its authorization scope, evidence fingerprint, relevant record versions, prompt version, or freshness requirements no longer match.

## AI retries and failures

- Use explicit request timeouts.
- Apply bounded retries only to retryable failures.
- Use backoff with jitter where appropriate.
- Avoid nested retry multiplication.
- Avoid retrying invalid requests or invalid output indefinitely.
- Prevent uncontrolled concurrent requests.
- Respect provider rate limits.
- Support cancellation when the client disconnects and cancellation is safe.
- Do not allow a slow model to block unrelated requests.
- Return deterministic findings when AI is unavailable.
- Clearly indicate when AI synthesis was skipped or unavailable.

Do not claim zero latency or zero token usage for operations that actually invoke an LLM.

For simple payment-status requests, prove that the number of LLM invocations is exactly zero.

---

# 7. IMPLEMENTATION PHASES

Execute the specification's roadmap in order, with dependency-aware adjustments where necessary.

Do not skip a phase merely because the UI looks complete.

## Phase 0 — Discovery

Deliver:

- Complete specification review.
- Requirement inventory.
- Dependency inventory.
- Dependency verification records completed before any installation or import.
- Existing repository audit.
- Conflict and ambiguity register.
- Initial risk assessment.
- Implementation plan.
- Baseline format, lint, type-check, test, migration, and build results.
- Initial `FeatureEvidence` matrix with every mandatory feature in `NOT_STARTED` or `BLOCKED` state.

Acceptance criterion: Every requirement has a traceable identifier or reference, a defined verification approach, and an evidence owner. No dependency is installed before its audit record exists.

## Phase 1 — Architecture

Define:

- Module boundaries.
- Database ownership and access patterns.
- API contracts.
- Authorization flow.
- Tenant isolation.
- Cache keys and freshness.
- AI provider abstraction.
- Error model.
- Testing strategy.
- Architecture decision records.

Acceptance criterion: The architecture preserves every required business and security invariant.

## Phase 2 — Foundation

Implement:

- Repository structure.
- Package manifests and lockfiles.
- TypeScript strict configuration.
- Formatting and linting.
- Typed configuration.
- Startup validation.
- Docker Compose.
- PostgreSQL development environment.
- Structured logging.
- Test infrastructure.
- CI pipeline.
- Dependency and secret scanning.

Acceptance criterion: A clean checkout can be installed, configured, checked, tested, and built reproducibly.

## Phase 3 — Secure Core

Implement:

- Database migrations.
- Authentication.
- Session management.
- Organization membership.
- Role-based permissions.
- Tenant-scoped repositories.
- PostgreSQL RLS.
- Audit events.
- Synthetic seed data.
- Security integration tests.

Acceptance criterion: Unauthorized cross-tenant reads fail, pooled database connections do not leak tenant context, and the documented authentication workflows pass their tests.

## Phase 4 — Deterministic Investigation Engine

Implement:

- Payment and order models.
- Payment status retrieval.
- Webhook processing state.
- Ledger and journal checks.
- Settlement reconciliation.
- All documented detection rules.
- Incident classification and persistence.
- Evidence generation.
- Query indexes.
- Payment timelines.
- Investigation fingerprints.

Acceptance criterion: Every documented detection rule is implemented and tested against its expected cases. All documented scenarios have traceable test results.

## Phase 5 — AI Integration

Implement:

- Provider interface.
- Current supported Gemini SDK.
- Configurable, verified model identifier.
- Prompt version management.
- Evidence assembly and redaction.
- Structured output.
- Runtime schema validation.
- Evidence reference verification.
- AI latency and token metrics.
- Timeouts and bounded retries.
- Provider outage handling.
- Adversarial AI tests.

Acceptance criterion: AI output cannot override financial facts, bypass permissions, or introduce unsupported evidence.

## Phase 6 — Caching and Performance

Implement:

- Frontend query caching.
- Backend bounded LRU cache.
- Organization-scoped keys.
- Evidence fingerprints.
- Cache invalidation.
- Transactional outbox worker.
- Single-flight deduplication.
- Memory and latency instrumentation.
- Performance benchmarks.

Acceptance criterion: Repeated authorized status queries avoid the LLM, stale results are invalidated correctly, and cache growth remains bounded.

## Phase 7 — UI/UX

Implement all required pages, routes, tables, cards, charts, filters, dialogs, navigation, and reusable components documented in the specification.

Include:

- Dashboard.
- Payments.
- Payment details and timeline.
- Incidents.
- Investigation details.
- Analytics.
- Authentication.
- Organization and settings workflows.
- Loading states.
- Error states.
- Empty states.
- AI-unavailable states.
- Responsive layouts.
- Keyboard accessibility.
- Clear separation between verified facts and AI-generated explanations.

Acceptance criterion: Every documented UI workflow is connected to the actual backend and passes its relevant E2E tests.

Do not substitute static mock screens for working product features.

## Phase 8 — Hardening

Run:

- Security tests.
- Tenant isolation tests.
- Adversarial AI tests.
- Database migration tests.
- Cache invalidation tests.
- Concurrency tests.
- AI outage tests.
- Load tests.
- Soak tests.
- Memory growth tests.
- Dependency vulnerability scans.
- Secret scans.
- Production build checks.
- End-to-end workflows.

Acceptance criterion: All mandatory release gates pass, and all unresolved risks are documented honestly.

## Phase 9 — Delivery

Deliver:

- Working application.
- Reproducible local setup.
- Environment variable documentation.
- Database migrations and synthetic seeds.
- API documentation.
- Architecture documentation.
- Security and threat model documentation.
- Dependency audit.
- Test results.
- Performance measurements.
- Known issues.
- Deployment instructions.
- Demo walkthrough.

Acceptance criterion: Another engineer can clone the repository, configure the environment, start the application, run the tests, and reproduce the demo without relying on undocumented local state.

---

# 8. ENGINEERING AND CODE QUALITY RULES

The specification's strict TypeScript, linting, naming, configuration, and code-quality requirements are mandatory unless an actual toolchain incompatibility requires a documented adjustment.

## TypeScript

Use strict type checking.

Preserve the specified requirements for:

- Unused variables and parameters.
- Unhandled promises.
- Unsafe assignments.
- Unsafe calls and member access.
- Explicit `any`.
- Implicit return paths.
- Import cycles.
- Non-null assertions.
- Consistent type imports.
- Exact optional property types.

Use current compatible tooling and configuration formats.

Do not weaken compiler or lint rules merely to get the build green.

Do not use `@ts-nocheck`, blanket ESLint disables, or unsafe casts to conceal defects.

Any necessary exception must be narrow, justified, documented, and covered by tests.

## Configuration

All environment-specific settings must be centralized and validated.

Never hardcode:

- Secrets.
- API keys.
- Database credentials.
- Model identifiers.
- Production URLs.
- Security-sensitive configuration.
- Operational timeouts.
- Retry counts.
- Cache limits.
- Rate limits.
- Incident thresholds.

Use environment variables and the typed configuration module.

Fail fast when required configuration is invalid.

Never print secret values while reporting configuration errors.

## Error handling

- Use typed domain errors.
- Use consistent API error responses.
- Preserve useful error context without exposing secrets.
- Handle asynchronous failures.
- Avoid swallowed exceptions.
- Avoid unhandled promise rejections.
- Do not return stack traces or internal SQL to clients in production.
- Do not claim an operation succeeded before its required transaction commits.

## Maintainability

- Avoid duplicated business logic.
- Use descriptive names.
- Follow the specification's naming conventions.
- Avoid unnecessary abstractions.
- Avoid speculative infrastructure.
- Keep modules cohesive.
- Document important decisions.
- Do not commit unexplained commented-out code.
- Do not add unresolved TODOs without linked issues, as required by the specification.

---

# 9. DATABASE AND MIGRATION SAFETY

Treat the database schema as part of the product contract.

Before implementing each module:

1. Inspect the relevant schema and documented relationships.
2. Verify foreign-key dependencies.
3. Confirm that constraints match the business rules.
4. Create versioned migrations.
5. Test migrations against an empty database.
6. Test upgrades against the previous schema.
7. Verify indexes against actual query patterns.
8. Test RLS policies using the real application database role.
9. Verify transaction and rollback behavior.
10. Seed only synthetic demo data.

Never modify an already-applied migration to disguise a schema change.

Create a new migration instead.

Never drop or truncate user data as a routine setup step.

Never disable foreign-key or RLS enforcement just to make seed scripts or tests pass.

Ensure that migrations and seed scripts are deterministic and repeatable where appropriate.

Verify that all documented tables, relationships, constraints, indexes, and required fields are implemented.

If the specification contains a schema ordering issue or a circular dependency, resolve it through correct migration ordering or supported deferred constraints. Document the decision.

---

# 10. TESTING IS PART OF IMPLEMENTATION

Tests are not an optional final phase.

Write tests alongside each feature.

For each feature, update the `FeatureEvidence` matrix with the exact test command and observed result. A test file that exists but was not executed does not satisfy the evidence gate.

## Unit tests

Cover:

- Payment state transitions.
- Order-payment mismatches.
- Incident detection.
- Rule thresholds.
- Ledger and journal invariants.
- Settlement calculations.
- Evidence selection.
- Redaction.
- Input and output schemas.
- Authorization decisions.
- Cache key generation.
- Fingerprint generation.
- Retry and timeout policies.
- Configuration validation.

## Integration tests

Use real PostgreSQL for:

- Migrations.
- Transactions.
- Foreign keys.
- Constraints.
- RLS.
- Connection-pool isolation.
- Tenant context cleanup.
- Webhook idempotency.
- Outbox processing.
- Cache invalidation.
- Concurrent updates.

Mock only external boundaries when a real external integration is not appropriate for the test.

## Security tests

Test the complete documented security matrix, including:

- Cross-tenant payment access.
- Forged organization identifiers.
- Unauthorized investigation access.
- Cross-tenant cache collisions.
- Cross-tenant AI evidence.
- Pooled connection context leakage.
- Malicious webhook instructions.
- Invented payment and evidence identifiers.
- Unauthorized mutations.
- Duplicate operations.
- Stale financial evidence.
- Secret leakage.
- Rate-limit bypass.
- Excessive request sizes.
- Retry storms.

## Adversarial AI tests

Test:

- Prompt injection in untrusted records.
- Invalid JSON.
- Invalid schema.
- Invented evidence references.
- Contradictory claims.
- Missing evidence.
- Cross-tenant evidence.
- Oversized output.
- Requests for secrets.
- Provider timeouts.
- Provider rate limiting.
- Provider outages.
- Unsupported conclusions.

## End-to-end tests

At minimum, verify the documented demonstration workflows:

1. Login using the synthetic demo account.
2. Search for a known successful payment.
3. Confirm that a simple status query makes zero LLM calls.
4. Repeat the query and verify cache reuse.
5. Investigate a documented payment inconsistency.
6. Verify that displayed facts match the database.
7. Verify that the AI explanation is visibly distinguished from authoritative facts.
8. Reject unauthorized cross-tenant access.
9. Invalidate cached results after a committed update.
10. Reject an invalid AI evidence reference.
11. Degrade gracefully when the AI provider is unavailable.
12. Complete the documented multi-system incident investigation.

Use stable fixtures and deterministic assertions.

Do not make tests pass by deleting assertions, weakening security, or changing expected behavior without a justified specification correction.

---

# 11. CONTINUOUS INTEGRATION AND RELEASE GATES

Configure CI so that every required gate must pass before a change is considered complete.

Required gates:

1. Formatting check.
2. ESLint with zero warnings.
3. TypeScript type check.
4. Unit tests.
5. Coverage thresholds defined by the specification.
6. PostgreSQL integration tests.
7. Migration verification.
8. Tenant isolation tests.
9. AI schema and evidence validation tests.
10. Production build.
11. Dependency vulnerability scan.
12. Secret scanning.
13. Dependency-cycle detection.
14. E2E tests.
15. Performance and reliability checks appropriate to the release stage.

Use current, supported GitHub Actions and action versions if GitHub Actions is the chosen CI platform.

Do not hardcode secrets into workflow files.

Do not make CI green by skipping failing tests or suppressing meaningful security warnings.

If a gate cannot run because an external credential or service is unavailable, mark it BLOCKED, explain why, and identify the exact verification still required.

A blocked test is not a passing test.

---

# 12. PERFORMANCE ACCEPTANCE CRITERIA

Use the specification's initial targets as engineering objectives, not as achieved results.

Verify at least:

- Cached payment-status API: p95 at or below 100 ms.
- Indexed database payment-status lookup: p95 at or below 200 ms.
- Identical concurrent investigations: one shared execution where deduplication applies.
- Repeated simple status queries: zero LLM calls.
- Successful cache invalidation: no stale result returned after the committed update and completed invalidation.
- AI outputs returned to clients: 100% pass schema validation.
- Unsupported evidence references: zero accepted.
- Unauthorized cross-tenant reads: zero successful reads.
- Cache memory: bounded by configuration.
- AI usage: measured per investigation.
- AI failure handling: no indefinite waits or uncontrolled retries.

Measure these targets in representative test environments.

Add the measurement harness and counters with the relevant feature, not after product completion. The payment-status path must expose a testable invocation counter or provider spy proving exactly zero LLM calls, and cache tests must prove that a committed update followed by completed invalidation cannot return the old result.

Record:

- Test hardware and runtime environment.
- Dataset size and workload.
- Concurrency.
- Number of requests.
- Cache hit rate.
- p50, p95, and p99 latency where meaningful.
- Database query latency.
- AI invocation count.
- Token usage.
- Error rate.
- Memory usage.
- Event-loop delay.
- Test duration.

Do not claim that the performance targets have been achieved without actual measurements.

If a target is missed, profile the bottleneck and fix the root cause before adding unnecessary infrastructure.

---

# 13. EXECUTION PROTOCOL

Work autonomously within the repository and available tools.

## Work in small, verifiable increments

For every feature:

1. Identify the corresponding specification requirements.
2. Check dependencies and existing implementation.
3. Define the expected behavior.
4. Implement the smallest complete vertical slice.
5. Add or update tests.
6. Run relevant checks.
7. Fix failures.
8. Review security and tenant isolation.
9. Update the traceability matrix.
10. Record the actual implementation status.

Prefer complete vertical slices over generating large amounts of disconnected code.

## Continue after each phase

Do not stop after producing the architecture, project structure, or first working screen.

Proceed through the roadmap until the entire application is implemented or a genuine blocker prevents further progress.

After each phase:

- Summarize files changed.
- Report features implemented.
- List tests executed.
- Report exact test results.
- Identify unresolved issues.
- Update `PROGRESS.md`.
- Continue to the next phase when its prerequisites are satisfied.

Do not ask the user to approve routine decisions already determined by the specification.

Ask for clarification only when a material ambiguity cannot be resolved safely or a required external action needs user authorization.

## Tool and environment failures

If a command fails:

1. Capture the actual error.
2. Identify its root cause.
3. Correct the underlying issue.
4. Re-run the failed command.
5. Re-run affected tests.
6. Record any unresolved blocker.

Do not repeatedly execute the same failing command without changing the cause.

Do not claim to have executed commands that were never run.

## Avoid destructive operations

Never:

- Delete existing user work without authorization.
- Reset the repository destructively.
- Drop a database containing potentially valuable data.
- Overwrite environment secrets.
- Commit API keys.
- Disable security controls to make a demo work.
- Change financial business rules merely to silence failing tests.

Before destructive or externally consequential operations, inspect the target and obtain explicit authorization when necessary.

---

# 14. DEFINITION OF DONE

The project is not complete merely because the frontend loads or the backend starts.

A requirement can be marked COMPLETE only when:

- Its implementation exists.
- Its behavior matches the specification.
- Relevant tests have been written.
- Required tests have actually passed.
- A `FeatureEvidence` record contains the exact passing test results and required measurements.
- Security implications have been reviewed.
- The implementation has been integrated into the application.
- Relevant documentation has been updated.
- No known critical issue remains unresolved.

Use the following status values:

- NOT_STARTED
- IN_PROGRESS
- IMPLEMENTED_NOT_VERIFIED
- BLOCKED
- COMPLETE
- DEFERRED_BY_SPECIFICATION

Never use COMPLETE for code that has not been verified.

The overall project can be declared RELEASE_READY only when all mandatory release gates pass and all release-blocking issues are resolved.

Do not claim that a project is error-free. Instead, report the checks performed, the results obtained, and any remaining limitations.

---

# 15. REQUIRED FINAL DELIVERABLES

At the end of implementation, provide:

## A. Product status

- Overall status.
- Completed phases.
- Remaining incomplete requirements.
- Release readiness.

## B. Requirement traceability

- Total requirements identified.
- Requirements implemented.
- Requirements verified.
- Requirements blocked.
- Requirements deferred.
- Exact references to implementation and tests.

## C. Functional coverage

- Detection rules implemented versus documented.
- Scenarios tested versus documented.
- API endpoints implemented versus documented.
- UI workflows implemented versus documented.

## D. Quality results

- Formatting.
- Lint.
- Type checking.
- Unit tests.
- Integration tests.
- Security tests.
- Adversarial AI tests.
- E2E tests.
- Migration tests.
- Production build.
- Dependency scans.
- Secret scans.

Report actual counts and results.

## D1. Feature evidence

Provide a feature-by-feature evidence table explicitly covering:

- Payment confirmation: database-backed authoritative response and exactly zero AI invocations.
- Tenant isolation: automated cross-tenant access tests pass.
- Incident investigation: documented rules trigger for documented scenarios.
- AI output: schema validation and evidence-reference checks pass.
- Caching: repeated requests reuse valid results and invalidation prevents stale results.
- Database migrations: apply successfully to an empty PostgreSQL database.
- Frontend: main workflows pass end-to-end tests.
- Production build: build succeeds without suppressed errors.

For every item, report the test command, actual result, and any limitation. Do not mark an item complete from source inspection or code generation.

## E. Performance results

- Payment-status latency.
- Cache performance.
- AI invocation counts.
- Token usage.
- Memory behavior.
- Load-test results.
- Unmet performance targets.

## F. Dependency audit

List the installed versions of major dependencies, their support status, and any important compatibility decisions.

Confirm that no known deprecated SDK or unsupported API remains in the implementation. If a package's status cannot be established, report that limitation instead of claiming certainty.

## G. Execution instructions

Provide exact commands for:

- Installing dependencies.
- Configuring environment variables.
- Starting PostgreSQL.
- Applying migrations.
- Loading synthetic seed data.
- Starting the backend.
- Starting the frontend.
- Running all tests.
- Building production artifacts.

## H. Known issues

List every unresolved blocker, important limitation, unverified external integration, and outstanding security or operational risk.

Do not conceal failed checks or incomplete functionality.

---

# 16. START NOW

Begin with Phase 0.

Your immediate tasks are:

1. Inspect the current repository and preserve existing work.
2. Locate and read the complete master specification.
3. Build the requirement inventory and traceability matrix.
4. Audit the dependency and SDK versions against current official documentation.
5. Identify deprecated libraries, obsolete model identifiers, incompatible APIs, and security risks.
6. Resolve implementation ambiguities and document necessary decisions.
7. Produce the implementation roadmap and verification plan.
8. Establish the baseline test and build status.
9. Create the initial `FeatureEvidence` matrix in `docs/implementation/FEATURE_EVIDENCE.md` and the dependency audit before installing packages.
10. Begin Phase 1 and continue through the implementation roadmap.
11. Keep the application runnable and the tests meaningful at every milestone.

Do not stop after writing a plan.

Do not generate placeholder implementations for core features.

Do not substitute mock data for required backend functionality.

Do not silently omit a requirement.

Do not claim success without evidence.

**Your objective is a complete, maintainable, secure, tested, and reproducible Scrutio Investigator application that faithfully implements the master specification using current supported technology.**