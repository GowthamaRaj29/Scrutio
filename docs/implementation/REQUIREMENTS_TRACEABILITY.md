# Requirements traceability

This initial matrix covers the foundation slice. The complete rule and scenario inventory must be expanded before the deterministic investigation phase is marked complete.

| Requirement                                 | Implementation                                                   | Verification                              | Status                   |
| ------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------- | ------------------------ |
| Strict TypeScript and no unused code        | `tsconfig.json`, ESLint                                          | `npm run typecheck`, `npm run lint`       | IN_PROGRESS              |
| Dependency verification before installation | `DEPENDENCY_AUDIT.md`                                            | Audit review and lockfile inspection      | IN_PROGRESS              |
| Authoritative payment status                | `apps/api/src/services/payment-status-service.ts`                | Unit and integration tests                | IMPLEMENTED_NOT_VERIFIED |
| Zero LLM calls for payment status           | Payment response invariant and tests                             | Invocation counter/provider spy           | IMPLEMENTED_NOT_VERIFIED |
| Tenant-scoped cache keys                    | `payment-status-cache.ts`                                        | Cross-tenant cache tests                  | IMPLEMENTED_NOT_VERIFIED |
| PostgreSQL authority and RLS                | `database/migrations/001_initial.sql`, PostgreSQL infrastructure | Empty migration and RLS integration tests | BLOCKED                  |
