# Implementation plan

## Current phase: Provider payment history ingestion

1. Establish reproducible package, TypeScript, lint, formatting, and test tooling. **Complete.**
2. Verify the baseline with `npm run check`. **Complete.**
3. Add PostgreSQL pool, transaction context, repository, migration runner, and integration tests. **Complete.**
4. Add authentication, sessions, authorization, audit events, and security tests. **Complete for the implemented API scope.**
5. Implement deterministic payment and incident rule engine with the documented rule/scenario matrix. **Partially complete: supported payment/order/webhook rules are implemented; remaining rule families are blocked by missing authoritative schemas.**
6. Add operational data models, repositories, persisted investigation results, bounded cache, outbox invalidation, and single-flight tests. **Operational data foundation complete; cache/outbox/single-flight remain next.**
7. Expose protected investigation creation and retrieval backed by authoritative PostgreSQL evidence. **Complete for the supported payment/order/webhook evidence slice; API and PostgreSQL authorization tests pass.**
8. Correct payment-status cache invalidation, tenant-safe single-flight behavior, bounded memory, and measurable local concurrency behavior. **Complete for the current single-process deployment model; cross-process invalidation remains a documented limitation.**
9. Add tenant-authenticated, idempotent order and webhook ingestion. **Complete for the currently supported order/webhook slice; ledger, settlement, and provider ingestion remain next.**
10. Add tenant-authenticated ledger entry ingestion with exact-decimal balance validation and source-event idempotency. **Complete for the existing ledger schema; settlement and richer reversal semantics remain next.**
11. Add tenant-authenticated settlement ingestion and payment-to-settlement relationship capture. **Complete for the schema-supported observed-link slice; allocation and reconciliation status remain blocked by missing schema semantics.**
12. Add tenant-authenticated provider payment-event ingestion and load the latest observed event into investigation evidence. **Complete for the observed-event slice; provider polling and duplicate-reference rule evaluation remain next.**
13. Add optional `@google/genai` integration only for Tier 3 synthesis, with strict schema/evidence validation.
14. Add React web application and end-to-end workflows.
15. Add CI gates, security scanning, migration verification, and performance measurements.

No phase is complete until its feature evidence is recorded in `FEATURE_EVIDENCE.md`.
