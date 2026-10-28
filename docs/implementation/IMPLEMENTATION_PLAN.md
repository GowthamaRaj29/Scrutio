# Implementation plan

## Current phase: Authentication and authorization

1. Establish reproducible package, TypeScript, lint, formatting, and test tooling. **Complete.**
2. Verify the baseline with `npm run check`. **Complete.**
3. Add PostgreSQL pool, transaction context, repository, migration runner, and integration tests. **Complete.**
4. Add authentication, sessions, authorization, audit events, and security tests. **Complete for the implemented API scope.**
5. Implement deterministic payment and incident rule engine with the documented rule/scenario matrix.
6. Add bounded cache, outbox invalidation, and single-flight tests.
7. Add optional `@google/genai` integration only for Tier 3 synthesis, with strict schema/evidence validation.
8. Add React web application and end-to-end workflows.
9. Add CI gates, security scanning, migration verification, and performance measurements.

No phase is complete until its feature evidence is recorded in `FEATURE_EVIDENCE.md`.
