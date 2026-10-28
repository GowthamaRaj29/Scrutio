# Official documentation audit

**Checked:** 2026-10-28  
**Scope:** Foundation and PostgreSQL phase

| Technology                    | Official source                                              | Verified decision                                                                                                       |
| ----------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Node.js                       | https://nodejs.org/docs/latest/api/                          | The local runtime is Node 20.19.4; the package requires Node 20.19 or newer.                                            |
| TypeScript                    | https://www.typescriptlang.org/tsconfig                      | Strict compiler options are enabled, including unused-code and exact optional-property checks.                          |
| Express                       | https://expressjs.com/en/5x/api.html                         | Express 5 API is used; Node 18+ is supported by the official documentation.                                             |
| PostgreSQL row-level security | https://www.postgresql.org/docs/current/ddl-rowsecurity.html | RLS is enabled and forced on the payments table; application transaction context supplies the verified organization ID. |
| node-postgres                 | https://node-postgres.com/                                   | Pooling, parameterized queries, explicit transactions, and client release are used.                                     |
| Google GenAI SDK              | https://ai.google.dev/gemini-api/docs/libraries              | `@google/genai` is selected; the legacy JavaScript SDK is not used.                                                     |
| Gemini models                 | https://ai.google.dev/gemini-api/docs/models                 | Model availability must be checked before enabling an external AI call.                                                 |
| Gemini deprecations           | https://ai.google.dev/gemini-api/docs/deprecations           | Model shutdown status must be rechecked before release.                                                                 |

No paid service or external AI call is required for the deterministic payment-status path.

The PostgreSQL application role must not be a superuser or have `BYPASSRLS`; using the bootstrap superuser for application queries would invalidate the RLS security boundary.
