# Dependency audit

**Checked:** 2026-10-28  
**Status:** Initial foundation audit; re-check on every dependency change.

## Verification sources

| Dependency        |                  Selected version | Official source                                    | Decision                                                                                                                                                                                                                       |
| ----------------- | --------------------------------: | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Node.js           |                            20.19+ | https://nodejs.org/docs/latest/api/                | Use the existing Node 20 runtime floor; validate CI with a supported LTS runtime.                                                                                                                                              |
| TypeScript        |                             5.9.3 | https://www.typescriptlang.org/docs/               | Selected instead of the newer registry release because the audited `typescript-eslint` release requires TypeScript below 6.1; strict compiler settings are enabled. Revisit together during the next compatible major upgrade. |
| Express           |                             5.3.0 | https://expressjs.com/en/5x/api.html               | Use the current major API; avoid legacy Express 4 examples.                                                                                                                                                                    |
| Zod               |                             4.6.7 | https://zod.dev/                                   | Runtime validation for configuration and request boundaries.                                                                                                                                                                   |
| node-postgres     |                            8.16.3 | https://node-postgres.com/                         | PostgreSQL access boundary; integration wiring follows after migration foundation.                                                                                                                                             |
| Google GenAI SDK  |                            2.31.0 | https://ai.google.dev/gemini-api/docs/libraries    | Use `@google/genai`; do not use the deprecated `@google/generative-ai`.                                                                                                                                                        |
| typescript-eslint |                            8.72.1 | https://typescript-eslint.io/                      | Type-aware ESLint configuration for the strict TypeScript source.                                                                                                                                                              |
| Gemini model      | `gemini-3.8-flash` (configurable) | https://ai.google.dev/gemini-api/docs/models       | Current stable model documented at audit time; verify availability before enabling an external call.                                                                                                                           |
| Gemini lifecycle  |                               N/A | https://ai.google.dev/gemini-api/docs/deprecations | Model availability and shutdown status must be rechecked before release.                                                                                                                                                       |

## Security and cost decisions

- No API key is required for deterministic payment-status functionality.
- Gemini is an optional integration boundary and is not required for the core application.
- Dependency installation occurred only after this audit was written.
- Versions are pinned in `package.json`; the generated lockfile is authoritative after installation.
