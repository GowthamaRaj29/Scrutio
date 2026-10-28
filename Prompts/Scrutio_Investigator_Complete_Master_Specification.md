# Scrutio Investigator
## Complete Master Specification — Product, Engineering, Security, Compliance, AI, Database, API, UI, and Delivery

**Version:** 1.0  
**Status:** Active  
**Document purpose:** Single, authoritative source of truth for all requirements, architecture decisions, security principles, compliance considerations, implementation plan, AI strategy, database schema, API design, UI component inventory, code quality standards, and delivery plan for the Scrutio Investigator project.

**Project context:** Scrutio Investigator is a fresh AI-build challenge project intended to demonstrate original engineering judgment, useful AI integration, robust core logic, and production-minded implementation. The concept is an AI-assisted payment operations and reconciliation incident investigator.

**Important scope note:** This is an engineering plan and design specification. All performance targets are initial targets until measured. Legal applicability depends on the actual business model, deployment, and data flows. Use synthetic data for the challenge demo.

---

# 1. Challenge Goal and Product Vision

The challenge prompt asks for something original that solves a real, difficult problem — prioritizing core logic over surface polish, using AI only when it adds genuine value.

Scrutio Investigator addresses payment operations problems such as:

- A payment provider reports success while the merchant order remains pending.
- A webhook was received but not processed.
- A payment has no corresponding ledger entry.
- A settlement status does not match the expected payment or ledger state.
- Repeated payment failures may share a common cause.
- An operator needs an evidence-backed explanation and a safe next step.

The product must not be a chat interface attached to a database. Its core value comes from reliable deterministic checks, authorized evidence retrieval, incident detection, auditability, and carefully bounded AI reasoning.

## 1.1 Core Product Principles

1. Financial facts come from authoritative records and deterministic logic.
2. AI is used only when reasoning or language synthesis adds real value.
3. AI must not have unrestricted database access or authority to perform financial mutations.
4. Every important diagnosis must be evidence-backed.
5. Tenant isolation and authorization must apply to every data path, including caches, conversations, background jobs, and AI retrieval.
6. The first version is read-only and recommendation-only.
7. Recovery actions, if introduced later, require explicit authorization, approval, revalidation, idempotency, durable execution, and audit records.
8. Prefer a simple, maintainable architecture; add infrastructure only when measured needs justify it.
9. Use synthetic data for the challenge demo.
10. Do not claim legal compliance, certification, performance, or accuracy without evidence.

---

# 2. Functional Scope

## 2.1 Payment Status and Confirmation

Provide fast, authoritative answers for:
- Is payment `PAY-10245` successful?
- What is the current payment status?
- Does the associated order reflect the payment?
- Was the relevant webhook verified and processed?
- Is a matching ledger entry present?
- When was the payment record last updated?

These use deterministic backend logic — not an LLM call.

## 2.2 Incident Investigation

Investigate mismatches among: payment provider records, merchant order state, webhook delivery and processing records, ledger entries and journal lines, settlement records, and relevant workflow events.

The investigation engine first performs deterministic checks. AI then synthesizes the retrieved evidence, explains plausible causes, identifies missing information, and recommends a next investigative step.

## 2.3 Investigation Results

A useful investigation result contains:
- Concise summary.
- Verified facts and evidence identifiers.
- Likely cause, clearly distinguished from a confirmed cause.
- Missing evidence or uncertainty.
- Recommended next step.
- Evidence freshness and version metadata.
- Investigation timestamp and validation status.
- Model version and prompt version when AI was used.

A model-generated confidence label is not a calibrated probability.

## 2.4 Recovery Actions (Deferred)

The initial product is read-only and recommendation-only. If recovery is introduced later:
- The operator must have the required permission.
- The exact action and affected resource must be shown before approval.
- The system must revalidate current authoritative state immediately before execution.
- The operation must use idempotency controls.
- Durable workflow state and audit events must be recorded.
- The outcome must be verified after execution.
- External API calls must not be assumed atomic with a PostgreSQL transaction.
- Use an outbox or durable workflow pattern where reliable cross-system processing is required.

---

# 3. Architecture

## 3.1 Technology Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React + TypeScript | Responsive, accessible investigation UI |
| Frontend server state | TanStack Query v5 | Request deduplication, controlled cache freshness |
| Backend | Node.js + Express + TypeScript | Typed API, modular backend |
| Database | PostgreSQL | Authoritative transactional data |
| Validation | Zod | Runtime validation for requests, DB inputs, and AI outputs |
| AI provider | Gemini — configurable via environment (see Section 8) | Abstracted; model swappable without code changes |
| Local cache | Bounded in-process LRU cache | Single instance, low overhead |
| Distributed cache | Redis — only when multi-instance workload justifies it | Not at launch |
| Background processing | PostgreSQL transactional outbox + worker | Reliable invalidation and async workflows |
| Local development | Docker Compose | Reproducible environment |
| Testing | Unit, integration, security, adversarial AI, performance, E2E | Continuous verification |
| CI | Format, lint, typecheck, test, migrate, build, security scan | Block unsafe changes |

Start with a **modular monolith**. Clear module boundaries allow future separation if needed.

## 3.2 Domain Modules

```
identity          — auth, sessions, user management
organizations     — tenant membership, roles, permissions
payments          — payment records, status, provider data
orders            — order state and lifecycle
incidents         — mismatch detection, rule evaluation, incident records
investigations    — investigation pipeline, evidence assembly, AI orchestration
webhooks          — inbound webhook receipt, verification, processing
ledger            — ledger entries, journal lines
settlements       — settlement records and reconciliation
ai                — provider abstraction, prompt management, output validation
audit             — audit event recording and query
observability     — metrics, tracing, health endpoints
config            — typed configuration, startup validation
```

## 3.3 Repository Structure

```
Scrutio-investigator/
├── apps/
│   ├── web/
│   │   └── src/
│   │       ├── app/
│   │       ├── routes/
│   │       ├── layouts/
│   │       ├── features/
│   │       │   ├── auth/
│   │       │   ├── dashboard/
│   │       │   ├── payments/
│   │       │   ├── incidents/
│   │       │   ├── investigations/
│   │       │   ├── analytics/
│   │       │   └── settings/
│   │       ├── components/
│   │       │   ├── ui/           — shadcn primitives
│   │       │   └── shared/       — cross-feature reusable
│   │       ├── hooks/
│   │       ├── lib/
│   │       │   ├── api-client.ts
│   │       │   ├── query-keys.ts
│   │       │   └── utils.ts
│   │       ├── types/
│   │       └── styles/
│   └── api/
│       └── src/
│           ├── app.ts
│           ├── server.ts
│           ├── config/
│           │   └── index.ts      — single typed config export
│           ├── modules/
│           │   ├── identity/
│           │   ├── organizations/
│           │   ├── payments/
│           │   ├── orders/
│           │   ├── incidents/
│           │   ├── investigations/
│           │   ├── webhooks/
│           │   ├── ledger/
│           │   ├── settlements/
│           │   ├── ai/
│           │   └── audit/
│           ├── infrastructure/
│           │   ├── database/
│           │   ├── cache/
│           │   └── outbox/
│           ├── middleware/
│           └── observability/
├── packages/
│   ├── contracts/        — shared TypeScript types and Zod schemas
│   ├── config/           — shared config schema
│   └── test-utils/
├── database/
│   ├── migrations/
│   ├── seeds/
│   │   ├── 00_organizations.sql
│   │   ├── 01_users.sql
│   │   ├── 02_memberships.sql
│   │   ├── 10_orders.sql
│   │   ├── 11_payments.sql
│   │   ├── 12_webhook_events.sql
│   │   ├── 13_ledger_entries.sql
│   │   ├── 14_journal_lines.sql
│   │   ├── 15_settlements.sql
│   │   ├── 16_settlement_payments.sql
│   │   ├── 17_incidents.sql
│   │   └── README.md
│   └── tests/
├── tests/
│   ├── integration/
│   ├── security/
│   ├── adversarial-ai/
│   ├── performance/
│   └── e2e/
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── security/
│   ├── compliance/
│   ├── database/
│   ├── testing/
│   ├── decisions/        — Architecture Decision Records
│   └── deployment/
├── scripts/
├── .github/workflows/
├── .env.example
├── .eslintrc.json
├── .prettierrc
├── tsconfig.base.json
├── .gitignore
├── README.md
└── SECURITY.md
```

---

# 4. Code Quality Standards

## 4.1 TypeScript Configuration

Every TypeScript project (web, api, packages) inherits from a base config:

```jsonc
// tsconfig.base.json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": false,
    "esModuleInterop": true,
    "moduleResolution": "bundler",
    "target": "ES2022",
    "lib": ["ES2022"]
  }
}
```

`noUnusedLocals` and `noUnusedParameters` are non-negotiable. Any unused variable or parameter is a compilation error that blocks the CI pipeline.

## 4.2 ESLint Configuration

```jsonc
// .eslintrc.json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "plugins": [
    "@typescript-eslint",
    "unused-imports",
    "import"
  ],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended-type-checked",
    "plugin:import/recommended",
    "plugin:import/typescript"
  ],
  "rules": {
    // Unused variables — error, not warning
    "@typescript-eslint/no-unused-vars": [
      "error",
      { "vars": "all", "args": "all", "ignoreRestSiblings": false, "argsIgnorePattern": "^_" }
    ],
    "unused-imports/no-unused-imports": "error",
    "unused-imports/no-unused-vars": [
      "error",
      { "vars": "all", "varsIgnorePattern": "^_", "args": "all", "argsIgnorePattern": "^_" }
    ],

    // Type safety
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unsafe-assignment": "error",
    "@typescript-eslint/no-unsafe-call": "error",
    "@typescript-eslint/no-unsafe-member-access": "error",
    "@typescript-eslint/no-unsafe-return": "error",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/await-thenable": "error",
    "@typescript-eslint/no-misused-promises": "error",
    "@typescript-eslint/consistent-type-imports": ["error", { "prefer": "type-imports" }],

    // Import hygiene
    "import/no-duplicates": "error",
    "import/no-cycle": "error",
    "import/order": [
      "error",
      {
        "groups": ["builtin", "external", "internal", "parent", "sibling", "index", "type"],
        "newlines-between": "always",
        "alphabetize": { "order": "asc" }
      }
    ],

    // General
    "no-console": ["error", { "allow": ["warn", "error"] }],
    "no-debugger": "error",
    "no-var": "error",
    "prefer-const": "error",
    "eqeqeq": ["error", "always"],
    "no-throw-literal": "error",
    "no-return-await": "error",
    "@typescript-eslint/no-non-null-assertion": "error"
  }
}
```

**Rule on underscore prefix:** A parameter intentionally unused (e.g., an Express `_next` in a handler) must be prefixed with `_`. No other silent suppression is permitted.

## 4.3 Naming Conventions

| Item | Convention | Examples |
|---|---|---|
| Source files | kebab-case | `payment-investigation.service.ts`, `webhook-processor.ts` |
| React component files | PascalCase | `PaymentStatusCard.tsx`, `InvestigationPanel.tsx` |
| Test files | Same name + `.test.ts` or `.spec.ts` | `payment.service.test.ts` |
| Variables | camelCase | `paymentId`, `organizationId`, `fetchedAt` |
| Functions | camelCase, verb-first | `fetchPaymentStatus`, `validateWebhookSignature`, `buildEvidencePackage` |
| TypeScript types / interfaces | PascalCase | `PaymentEvidence`, `InvestigationResult`, `WebhookEvent` |
| Zod schemas | camelCase with `Schema` suffix | `paymentEvidenceSchema`, `investigationResultSchema` |
| Enums | PascalCase for name; SCREAMING_SNAKE_CASE for values | `PaymentStatus.SUCCESS`, `IncidentSeverity.CRITICAL` |
| True constants (never change) | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT`, `DEFAULT_CACHE_TTL_MS` |
| Config keys | camelCase | `aiProviderModel`, `databaseUrl`, `cacheMaxEntries` |
| Environment variables | SCREAMING_SNAKE_CASE | `AI_PROVIDER_MODEL`, `DATABASE_URL`, `CACHE_MAX_ENTRIES` |
| Database tables | snake_case, plural | `payments`, `webhook_events`, `ledger_entries` |
| Database columns | snake_case | `organization_id`, `payment_id`, `created_at` |
| API routes | kebab-case, plural nouns | `/api/v1/payments`, `/api/v1/incidents`, `/api/v1/webhook-events` |
| React hooks | camelCase, `use` prefix | `usePaymentStatus`, `useInvestigation`, `useIncidentList` |
| CSS / Tailwind custom classes | kebab-case | `payment-status-card`, `incident-badge` |

**Banned names:** `data`, `info`, `temp`, `x`, `y`, `val`, `obj`, `res` (except as Express `res`), `err` (use `error`), `cb` (use `callback` or a descriptive name). Names must describe the value they hold.

**No abbreviations** unless universally understood in the domain: `id`, `url`, `api`, `db`, `rls`, `ttl`, `utc`, `lru`.

## 4.4 Pre-commit Enforcement

```jsonc
// package.json (root)
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "prettier --write",
      "eslint --fix --max-warnings 0"
    ],
    "*.{json,md,yaml,yml}": ["prettier --write"]
  }
}
```

`--max-warnings 0` means any ESLint warning also blocks the commit. Warnings are not accepted.

## 4.5 Additional Code Quality Rules

- No duplicated business logic. A rule, formula, or validation must exist in exactly one place.
- No commented-out code committed to the main branch.
- No `TODO` comments committed without a linked issue number (`// TODO(#142): ...`).
- No hardcoded URLs, secrets, model names, timeouts, or magic numbers outside `config/index.ts`.
- Every thrown error must be an instance of a typed error class; no `throw new Error('something went wrong')` without context.
- Every `async` function that can fail must handle its error — no unhandled Promise rejections.
- No `@ts-ignore` or `@ts-expect-error` without a comment explaining why it is unavoidable.
- Dependency cycle detection via `import/no-cycle` in ESLint and `madge` in CI.

---

# 5. Centralized Configuration

All environment-specific values, operational settings, timeouts, model identifiers, and secrets are defined in one typed configuration module. Nothing is hardcoded in business logic.

## 5.1 Environment Variables (.env.example)

```dotenv
# ── Application ─────────────────────────────────────────────────────
NODE_ENV=development
PORT=3001
ALLOWED_ORIGINS=http://localhost:5173

# ── Database ─────────────────────────────────────────────────────────
DATABASE_URL=postgresql://Scrutio_user:password@localhost:5432/Scrutio_dev
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_QUERY_TIMEOUT_MS=5000
DATABASE_IDLE_TIMEOUT_MS=30000

# ── Session / Auth ────────────────────────────────────────────────────
SESSION_SECRET=change-me-in-production-64-chars-min
SESSION_TTL_SECONDS=3600
SESSION_MAX_FAILED_LOGIN_ATTEMPTS=5
SESSION_LOCK_DURATION_MINUTES=30

# ── AI Provider ───────────────────────────────────────────────────────
# Change AI_PROVIDER_MODEL to swap models without any code change.
# Supported values: gemini-1.5-flash-latest, gemini-1.5-flash-8b-latest,
#                   gemini-1.5-pro-latest, gemini-2.0-flash-exp
AI_PROVIDER_NAME=gemini
AI_PROVIDER_API_KEY=your-gemini-api-key-here
AI_PROVIDER_MODEL=gemini-1.5-flash-latest
AI_MAX_OUTPUT_TOKENS=512
AI_TEMPERATURE=0.1
AI_REQUEST_TIMEOUT_MS=15000
AI_MAX_RETRIES=2
AI_RETRY_BACKOFF_BASE_MS=500
AI_PROMPT_VERSION=v1.0

# ── Cache ─────────────────────────────────────────────────────────────
CACHE_MAX_ENTRIES=500
CACHE_PAYMENT_STATUS_TTL_MS=30000
CACHE_INVESTIGATION_TTL_MS=120000
CACHE_CONFIG_TTL_MS=300000

# ── Rate Limiting ─────────────────────────────────────────────────────
RATE_LIMIT_AUTH_LOGIN_PER_MINUTE=10
RATE_LIMIT_INVESTIGATIONS_PER_USER_PER_MINUTE=30
RATE_LIMIT_INVESTIGATIONS_PER_ORG_PER_MINUTE=100
RATE_LIMIT_GENERAL_PER_MINUTE=200

# ── Incident Engine ───────────────────────────────────────────────────
INCIDENT_PENDING_PAYMENT_THRESHOLD_MINUTES=30
INCIDENT_SETTLEMENT_MISSING_THRESHOLD_DAYS=3
INCIDENT_WEBHOOK_UNPROCESSED_THRESHOLD_MINUTES=5
INCIDENT_BURST_FAILURE_WINDOW_HOURS=1
INCIDENT_BURST_FAILURE_COUNT_THRESHOLD=3
INCIDENT_METHOD_FAILURE_WINDOW_HOURS=6
INCIDENT_METHOD_FAILURE_COUNT_THRESHOLD=5
INCIDENT_FAILURE_RATE_THRESHOLD_PCT=30
INCIDENT_WEBHOOK_STORM_WINDOW_MINUTES=15
INCIDENT_WEBHOOK_STORM_COUNT_THRESHOLD=10

# ── Outbox ────────────────────────────────────────────────────────────
OUTBOX_POLL_INTERVAL_MS=1000
OUTBOX_MAX_RETRIES=5
OUTBOX_RETRY_BACKOFF_BASE_MS=1000

# ── Observability ─────────────────────────────────────────────────────
LOG_LEVEL=info
REQUEST_TIMEOUT_MS=30000
```

## 5.2 Typed Configuration Module

```typescript
// apps/api/src/config/index.ts

import { z } from 'zod';

const configSchema = z.object({
  app: z.object({
    nodeEnv: z.enum(['development', 'test', 'production']),
    port: z.coerce.number().int().positive(),
    allowedOrigins: z.string().transform((value) => value.split(',')),
    requestTimeoutMs: z.coerce.number().int().positive(),
  }),

  database: z.object({
    url: z.string().url(),
    poolMin: z.coerce.number().int().min(1),
    poolMax: z.coerce.number().int().min(2),
    queryTimeoutMs: z.coerce.number().int().positive(),
    idleTimeoutMs: z.coerce.number().int().positive(),
  }),

  session: z.object({
    secret: z.string().min(64),
    ttlSeconds: z.coerce.number().int().positive(),
    maxFailedLoginAttempts: z.coerce.number().int().min(1),
    lockDurationMinutes: z.coerce.number().int().positive(),
  }),

  ai: z.object({
    providerName: z.enum(['gemini']),
    apiKey: z.string().min(1),
    model: z.string().min(1),                // configurable; no hardcoded model name
    maxOutputTokens: z.coerce.number().int().positive(),
    temperature: z.coerce.number().min(0).max(2),
    requestTimeoutMs: z.coerce.number().int().positive(),
    maxRetries: z.coerce.number().int().min(0),
    retryBackoffBaseMs: z.coerce.number().int().positive(),
    promptVersion: z.string().min(1),
  }),

  cache: z.object({
    maxEntries: z.coerce.number().int().positive(),
    paymentStatusTtlMs: z.coerce.number().int().positive(),
    investigationTtlMs: z.coerce.number().int().positive(),
    configTtlMs: z.coerce.number().int().positive(),
  }),

  rateLimits: z.object({
    authLoginPerMinute: z.coerce.number().int().positive(),
    investigationsPerUserPerMinute: z.coerce.number().int().positive(),
    investigationsPerOrgPerMinute: z.coerce.number().int().positive(),
    generalPerMinute: z.coerce.number().int().positive(),
  }),

  incidentEngine: z.object({
    pendingPaymentThresholdMinutes: z.coerce.number().int().positive(),
    settlementMissingThresholdDays: z.coerce.number().int().positive(),
    webhookUnprocessedThresholdMinutes: z.coerce.number().int().positive(),
    burstFailureWindowHours: z.coerce.number().int().positive(),
    burstFailureCountThreshold: z.coerce.number().int().positive(),
    methodFailureWindowHours: z.coerce.number().int().positive(),
    methodFailureCountThreshold: z.coerce.number().int().positive(),
    failureRateThresholdPct: z.coerce.number().positive(),
    webhookStormWindowMinutes: z.coerce.number().int().positive(),
    webhookStormCountThreshold: z.coerce.number().int().positive(),
  }),

  outbox: z.object({
    pollIntervalMs: z.coerce.number().int().positive(),
    maxRetries: z.coerce.number().int().min(0),
    retryBackoffBaseMs: z.coerce.number().int().positive(),
  }),

  observability: z.object({
    logLevel: z.enum(['debug', 'info', 'warn', 'error']),
  }),
});

export type AppConfig = z.infer<typeof configSchema>;

function loadConfig(): AppConfig {
  const rawConfig = {
    app: {
      nodeEnv: process.env['NODE_ENV'],
      port: process.env['PORT'],
      allowedOrigins: process.env['ALLOWED_ORIGINS'],
      requestTimeoutMs: process.env['REQUEST_TIMEOUT_MS'],
    },
    database: {
      url: process.env['DATABASE_URL'],
      poolMin: process.env['DATABASE_POOL_MIN'],
      poolMax: process.env['DATABASE_POOL_MAX'],
      queryTimeoutMs: process.env['DATABASE_QUERY_TIMEOUT_MS'],
      idleTimeoutMs: process.env['DATABASE_IDLE_TIMEOUT_MS'],
    },
    session: {
      secret: process.env['SESSION_SECRET'],
      ttlSeconds: process.env['SESSION_TTL_SECONDS'],
      maxFailedLoginAttempts: process.env['SESSION_MAX_FAILED_LOGIN_ATTEMPTS'],
      lockDurationMinutes: process.env['SESSION_LOCK_DURATION_MINUTES'],
    },
    ai: {
      providerName: process.env['AI_PROVIDER_NAME'],
      apiKey: process.env['AI_PROVIDER_API_KEY'],
      model: process.env['AI_PROVIDER_MODEL'],
      maxOutputTokens: process.env['AI_MAX_OUTPUT_TOKENS'],
      temperature: process.env['AI_TEMPERATURE'],
      requestTimeoutMs: process.env['AI_REQUEST_TIMEOUT_MS'],
      maxRetries: process.env['AI_MAX_RETRIES'],
      retryBackoffBaseMs: process.env['AI_RETRY_BACKOFF_BASE_MS'],
      promptVersion: process.env['AI_PROMPT_VERSION'],
    },
    cache: {
      maxEntries: process.env['CACHE_MAX_ENTRIES'],
      paymentStatusTtlMs: process.env['CACHE_PAYMENT_STATUS_TTL_MS'],
      investigationTtlMs: process.env['CACHE_INVESTIGATION_TTL_MS'],
      configTtlMs: process.env['CACHE_CONFIG_TTL_MS'],
    },
    rateLimits: {
      authLoginPerMinute: process.env['RATE_LIMIT_AUTH_LOGIN_PER_MINUTE'],
      investigationsPerUserPerMinute: process.env['RATE_LIMIT_INVESTIGATIONS_PER_USER_PER_MINUTE'],
      investigationsPerOrgPerMinute: process.env['RATE_LIMIT_INVESTIGATIONS_PER_ORG_PER_MINUTE'],
      generalPerMinute: process.env['RATE_LIMIT_GENERAL_PER_MINUTE'],
    },
    incidentEngine: {
      pendingPaymentThresholdMinutes: process.env['INCIDENT_PENDING_PAYMENT_THRESHOLD_MINUTES'],
      settlementMissingThresholdDays: process.env['INCIDENT_SETTLEMENT_MISSING_THRESHOLD_DAYS'],
      webhookUnprocessedThresholdMinutes: process.env['INCIDENT_WEBHOOK_UNPROCESSED_THRESHOLD_MINUTES'],
      burstFailureWindowHours: process.env['INCIDENT_BURST_FAILURE_WINDOW_HOURS'],
      burstFailureCountThreshold: process.env['INCIDENT_BURST_FAILURE_COUNT_THRESHOLD'],
      methodFailureWindowHours: process.env['INCIDENT_METHOD_FAILURE_WINDOW_HOURS'],
      methodFailureCountThreshold: process.env['INCIDENT_METHOD_FAILURE_COUNT_THRESHOLD'],
      failureRateThresholdPct: process.env['INCIDENT_FAILURE_RATE_THRESHOLD_PCT'],
      webhookStormWindowMinutes: process.env['INCIDENT_WEBHOOK_STORM_WINDOW_MINUTES'],
      webhookStormCountThreshold: process.env['INCIDENT_WEBHOOK_STORM_COUNT_THRESHOLD'],
    },
    outbox: {
      pollIntervalMs: process.env['OUTBOX_POLL_INTERVAL_MS'],
      maxRetries: process.env['OUTBOX_MAX_RETRIES'],
      retryBackoffBaseMs: process.env['OUTBOX_RETRY_BACKOFF_BASE_MS'],
    },
    observability: {
      logLevel: process.env['LOG_LEVEL'],
    },
  };

  const result = configSchema.safeParse(rawConfig);

  if (!result.success) {
    // Fail fast at startup — never run with invalid configuration
    console.error('Configuration validation failed:', result.error.flatten());
    process.exit(1);
  }

  return result.data;
}

// Singleton — loaded once at startup; not reloaded at runtime
export const config: AppConfig = loadConfig();
```

**AI model change procedure:** To change the AI model, update `AI_PROVIDER_MODEL` in the environment and restart the process. No code change, no redeployment of a new build required. The new model name is validated against the Gemini SDK at first request; an invalid model causes a startup-time warning and runtime error isolation.

---

# 6. Security Architecture

Security is enforced by the backend and database, not by the UI or the model.

## 6.1 Authentication and Tenant Authorization Flow

For every request:
1. Authenticate the user; validate the session token against the `sessions` table.
2. Resolve the current organization membership and permissions server-side.
3. Do not trust an organization ID supplied by the browser or model.
4. Validate and normalize the request with Zod.
5. Apply tenant and resource scope to every database query and cache key.
6. Authorize access to every requested record.
7. Retrieve only the evidence the current user is permitted to see.
8. Return only the permitted result.

A cache hit never permits skipping access control. The backend must independently authorize every request.

## 6.2 PostgreSQL Row-Level Security

Use RLS as defense in depth after query-level tenant scoping.

```sql
-- Set transaction-locally after authentication and authorization:
-- SET LOCAL "app.organization_id" = '<verified-uuid>';

CREATE POLICY org_isolation ON payments
  USING (organization_id = current_setting('app.organization_id', true)::UUID);

-- Apply the same pattern to: orders, webhook_events, ledger_entries,
-- journal_lines, settlements, settlement_payments, incidents,
-- investigations, audit_events.
```

Requirements:
- The application database role must not be a superuser and must not have `BYPASSRLS`.
- Use `FORCE ROW LEVEL SECURITY` where appropriate.
- Set context transaction-locally so pooled connections do not retain a previous tenant's scope.
- Test context reset, transaction rollback, connection reuse, and concurrent requests.

## 6.3 AI Security Boundaries

The model must not receive: database credentials, unrestricted SQL access, general-purpose privileged tools, or the authority to decide tenant or user permissions.

Instead:
1. Backend authorization produces a trusted investigation context.
2. The backend retrieves authorized evidence.
3. Evidence is minimized and redacted.
4. The model receives a bounded evidence package (≤ 32 KB).
5. The model returns a structured response.
6. The backend validates the schema with Zod.
7. The backend verifies every evidence reference.
8. Deterministic logic verifies all financial facts.
9. Unsupported claims and unauthorized actions are rejected.

## 6.4 Prompt Injection and Untrusted Records

Payment records, webhook payloads, logs, and support messages are untrusted data. They may contain text that resembles instructions.

Mitigations:
- Strict tool allowlists.
- Structured input and output with JSON schema enforcement.
- Evidence size limits (see Section 13).
- Redaction of sensitive fields before evidence assembly.
- No model-controlled SQL.
- No execution of instructions found in records or logs.
- Verification of all model-referenced evidence IDs against the current investigation's authorized evidence set.
- Adversarial prompt-injection tests.

## 6.5 Tenant Isolation Across Every Stateful Component

Tenant boundaries apply to: SQL queries, row-level security, application caches, distributed cache keys, in-flight deduplication maps, AI conversations, vector or RAG retrieval, background jobs, investigation results, audit records, and attachments.

## 6.6 Audit Logging

Capture per audit event:
- User ID and organization ID.
- Correlation/request ID.
- Action and resource type/ID.
- Authorization outcome.
- Tool calls and investigation type.
- Model version and prompt version when AI was used.
- Output validation outcome.
- IP address and user agent.
- Timestamp.

Never log: passwords, tokens, API keys, full card numbers, CVV, or raw sensitive payloads.

## 6.7 Security Test Matrix

Test at minimum:
- Cross-tenant direct payment access.
- Forged organization IDs in headers.
- Unauthorized access to investigation results.
- Cross-tenant cache collision.
- Cross-tenant conversation or history reuse.
- Pooled connection tenant-context leakage.
- Malicious webhook content containing prompt injection.
- Model-invented payment IDs or evidence IDs.
- Unauthorized recovery actions.
- Duplicate recovery execution.
- Payment status changes during an investigation.
- Cache invalidation failure.
- Model outage and timeout behavior.
- Enumeration of payment IDs.
- Excessive requests, tool loops, and retry storms.
- Secret leakage in logs or AI prompts.

---

# 7. Compliance and Legal Applicability

This section identifies topics to assess; it is not legal advice or a declaration of compliance.

## 7.1 India DPDP Act and Rules

Assess the Digital Personal Data Protection Act, 2023 and Rules, 2025.
Reference: https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa

Assess: data fiduciary and processor roles, purpose limitation, notice and consent, data principal rights, security safeguards, breach handling, retention and deletion, processor contracts, and AI provider data-use terms.

## 7.2 RBI Payment-System Data-Storage Requirements

Reference: https://rbi.org.in/Scripts/NotificationUser.aspx?Id=11244

Applicability depends on entity, payment-system role, and contractual arrangement. Assess: data categories handled, storage and processing locations, third-party processor arrangements, and data flows to AI providers.

## 7.3 CERT-In Directions

Reference: https://www.cert-in.org.in/Directions70B.jsp

Review applicable directions including incident reporting and log retention requirements. Confirm current applicability for the actual deployment.

## 7.4 PCI DSS

Reference: https://www.pcisecuritystandards.org/document_library/?category=pcidss

Assess scope based on whether the system stores, processes, or transmits cardholder data. Never store CVV or full card details anywhere, including AI prompts and logs.

## 7.5 AI Provider Data Rules for the Challenge

Use entirely synthetic data in the demo. Do not send real merchant, payment, customer, confidential, or personal records to a free Gemini tier. Review provider terms, data processing agreements, retention settings, and regional processing before using real data.

**Never claim "RBI compliant", "DPDP compliant", or "PCI DSS certified" without a formal applicability assessment and supporting evidence.**

---

# 8. AI Configuration and Usage Strategy

## 8.1 The Core Principle

**Do not use AI for deterministic questions.**

Most requests must never reach the LLM. Payment status confirmation is a deterministic retrieval problem. The authoritative payment record and provider events determine the status.

## 8.2 Recommended Model

**Primary:** `gemini-1.5-flash-latest` (configured via `AI_PROVIDER_MODEL`)

Rationale:
- Sub-2-second p50 latency for evidence packages within the 32 KB limit.
- Structured JSON output with `responseMimeType: "application/json"` + `responseSchema` enforces schema at generation time.
- 1M token context window — well above the evidence size limit.
- Lower cost than Gemini Pro; appropriate for challenge builds.

**To switch the model:** Change `AI_PROVIDER_MODEL` in the environment and restart. No code change required.

Supported values documented in `.env.example`:
```
gemini-1.5-flash-latest         # Default; fastest, cheapest
gemini-1.5-flash-8b-latest      # Smaller; for simple single-rule synthesis
gemini-1.5-pro-latest           # Largest context; for complex cross-domain incidents
gemini-2.0-flash-exp            # Experimental; benchmark before using
```

## 8.3 AI Provider Abstraction

The AI module is isolated behind an interface. Business logic never calls the Gemini SDK directly.

```typescript
// apps/api/src/modules/ai/ai-provider.interface.ts

export interface AiInvestigationRequest {
  evidencePackage: EvidencePackage;
  promptVersion: string;
}

export interface AiInvestigationResponse {
  summary: string;
  likelyCause: string;
  evidenceIds: string[];
  confidence: 'low' | 'medium' | 'high';
  recommendedNextStep: string;
  uncertainties: string[];
}

export interface AiProvider {
  investigate(request: AiInvestigationRequest): Promise<AiInvestigationResponse>;
  isAvailable(): Promise<boolean>;
}
```

```typescript
// apps/api/src/modules/ai/gemini-provider.ts

import { GoogleGenerativeAI } from '@google/generative-ai';

import { config } from '../../config/index.js';
import { aiInvestigationResponseSchema } from './ai-response.schema.js';

import type { AiProvider, AiInvestigationRequest, AiInvestigationResponse } from './ai-provider.interface.js';

export class GeminiProvider implements AiProvider {
  private readonly client: GoogleGenerativeAI;

  constructor() {
    this.client = new GoogleGenerativeAI(config.ai.apiKey);
  }

  async investigate(request: AiInvestigationRequest): Promise<AiInvestigationResponse> {
    const model = this.client.getGenerativeModel({
      // Model name comes from config — not hardcoded
      model: config.ai.model,
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: config.ai.maxOutputTokens,
        temperature: config.ai.temperature,
      },
    });

    const prompt = buildInvestigationPrompt(request.evidencePackage, request.promptVersion);
    const result = await model.generateContent(prompt);
    const rawText = result.response.text();
    const parsed: unknown = JSON.parse(rawText);

    // Validate AI output against strict Zod schema before returning
    const validation = aiInvestigationResponseSchema.safeParse(parsed);
    if (!validation.success) {
      throw new AiOutputValidationError('AI response failed schema validation', validation.error);
    }

    return validation.data;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const model = this.client.getGenerativeModel({ model: config.ai.model });
      await model.generateContent('ping');
      return true;
    } catch {
      return false;
    }
  }
}
```

## 8.4 Tiered Request Processing

| Tier | Request Type | Processing | LLM Required? |
|---|---|---|---|
| Tier 0 | Valid authorized cache hit | Return cached result | No |
| Tier 1 | Payment status, amount, timestamp | Indexed DB query or cache | No |
| Tier 2 | Known mismatch, missing webhook, ledger discrepancy | Deterministic investigation engine | No |
| Tier 3 | Complex incident explanation, evidence synthesis, cross-incident pattern analysis | Bounded AI reasoning over authorized evidence | Yes |

The backend classifies requests with deterministic application logic. It does not call an LLM to decide whether a payment-status question is a payment-status question.

### Mandatory optimization invariants

These are architectural requirements from the first implementation phase, not later tuning tasks:

1. Request classification is deterministic and occurs after authentication, tenant resolution, and input validation, but before any AI provider code can run.
2. Payment-status, payment-amount, payment-timestamp, and equivalent authoritative lookup requests use an authorized cache lookup or indexed PostgreSQL query and make exactly zero LLM invocations.
3. Complex investigations use bounded evidence, bounded output, bounded retries, bounded concurrency, and single-flight deduplication where the request key is identical.
4. Cache and deduplication keys include tenant scope, authorization scope as applicable, normalized inputs, authoritative evidence/version fingerprints, and prompt version when AI is involved.
5. Instrumentation records cache hits and misses, invalidations, LLM invocation count, input/output tokens, latency, retries, and fallback behavior from the first implementation.

The implementation must include automated tests that prove these invariants. A code path that appears not to call an LLM without an invocation counter or provider spy is not sufficient evidence.

## 8.5 Prompt Version Management

All system prompts carry a version tag sourced from `config.ai.promptVersion`. The version is stored on every `investigations` row. When the prompt changes, increment the version in the environment. Investigation cache entries referencing an older prompt version are invalidated automatically.

## 8.6 AI Token and Latency Optimization

**Evidence minimization before every AI call:**

```typescript
// apps/api/src/modules/ai/evidence-assembler.ts

const MAX_EVIDENCE_BYTES = 32 * 1024; // 32 KB hard limit
const MAX_PATTERN_SAMPLES = 5;
const MAX_ERROR_TEXT_LENGTH = 500;
const MAX_FIELD_TEXT_LENGTH = 1000;

function assembleEvidencePackage(
  investigationContext: InvestigationContext,
): EvidencePackage {
  const rawPackage = buildRawPackage(investigationContext);
  const redacted = applyRedactionRules(rawPackage);
  const truncated = enforceFieldLengthLimits(redacted, MAX_FIELD_TEXT_LENGTH);
  const serialized = JSON.stringify(truncated);

  if (Buffer.byteLength(serialized, 'utf8') > MAX_EVIDENCE_BYTES) {
    throw new EvidenceTooLargeError(
      `Evidence package exceeds ${MAX_EVIDENCE_BYTES} bytes after truncation`,
    );
  }

  return truncated;
}
```

Never send raw database rows, webhook payloads, application logs, or ledger tables to Gemini. Send computed summaries, boolean flags, and counts.

**Conversation history:** Do not send the full chat history on every request. Store structured investigation state in the database. Retrieve only relevant context per request.

**Stable prompt components:** Keep stable instruction text separate from dynamic evidence. This enables provider-side prompt caching where available.

---

# 9. Database Schema

## 9.1 Schema Principles

- Every tenant-scoped table has a non-null `organization_id` foreign key.
- Every financial record has a `version` column incremented on every relevant update.
- Amount columns use `NUMERIC(18,2)` — never `FLOAT` or `DOUBLE PRECISION`.
- All timestamps use `TIMESTAMPTZ` (UTC stored, timezone-aware).
- UUIDs generated with `gen_random_uuid()`.
- No business logic in triggers; triggers handle only `updated_at` refresh and `version` increment.

## 9.2 Table Definitions

### organizations

```sql
CREATE TABLE organizations (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           VARCHAR(100) UNIQUE NOT NULL,
  name           VARCHAR(255) NOT NULL,
  plan           VARCHAR(50)  NOT NULL DEFAULT 'free'
                              CHECK (plan IN ('free','starter','growth','enterprise')),
  status         VARCHAR(50)  NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active','suspended','deleted')),
  settings       JSONB        NOT NULL DEFAULT '{}',
  webhook_secret VARCHAR(255),
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ
);
```

### users

```sql
CREATE TABLE users (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email                  VARCHAR(320) UNIQUE NOT NULL,
  password_hash          VARCHAR(255) NOT NULL,
  display_name           VARCHAR(255),
  email_verified_at      TIMESTAMPTZ,
  last_login_at          TIMESTAMPTZ,
  failed_login_count     INT          NOT NULL DEFAULT 0,
  locked_until           TIMESTAMPTZ,
  mfa_enabled            BOOLEAN      NOT NULL DEFAULT FALSE,
  mfa_secret_hash        VARCHAR(255),
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at             TIMESTAMPTZ
);
```

### user_organization_memberships

```sql
CREATE TABLE user_organization_memberships (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role            VARCHAR(50) NOT NULL CHECK (role IN ('owner','admin','analyst','viewer')),
  invited_by      UUID        REFERENCES users(id),
  accepted_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, organization_id)
);
```

### sessions

```sql
CREATE TABLE sessions (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash      VARCHAR(255) UNIQUE NOT NULL,
  organization_id UUID         REFERENCES organizations(id),
  ip_address      INET,
  user_agent      TEXT,
  last_active_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ  NOT NULL,
  revoked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

### payments

```sql
CREATE TABLE payments (
  id                    UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID           NOT NULL REFERENCES organizations(id),
  payment_id            VARCHAR(100)   NOT NULL,
  provider              VARCHAR(100)   NOT NULL,
  provider_reference_id VARCHAR(255),
  order_id              UUID           REFERENCES orders(id),
  amount                NUMERIC(18,2)  NOT NULL CHECK (amount >= 0),
  captured_amount       NUMERIC(18,2)  NOT NULL DEFAULT 0,
  refunded_amount       NUMERIC(18,2)  NOT NULL DEFAULT 0,
  currency              VARCHAR(10)    NOT NULL DEFAULT 'INR',
  status                VARCHAR(50)    NOT NULL
                                       CHECK (status IN (
                                         'INITIATED','PENDING','PROCESSING',
                                         'AUTHORIZED','SUCCESS','FAILED',
                                         'REFUNDED','PARTIALLY_REFUNDED',
                                         'DISPUTED','CANCELLED','EXPIRED'
                                       )),
  failure_code          VARCHAR(100),
  failure_message       TEXT,
  payment_method        VARCHAR(100),
  payment_method_detail JSONB,
  idempotency_key       VARCHAR(255),
  metadata              JSONB          NOT NULL DEFAULT '{}',
  provider_response     JSONB,
  version               INT            NOT NULL DEFAULT 1,
  initiated_at          TIMESTAMPTZ,
  authorized_at         TIMESTAMPTZ,
  captured_at           TIMESTAMPTZ,
  failed_at             TIMESTAMPTZ,
  refunded_at           TIMESTAMPTZ,
  disputed_at           TIMESTAMPTZ,
  cancelled_at          TIMESTAMPTZ,
  expired_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, payment_id)
);
```

### orders

```sql
CREATE TABLE orders (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID           NOT NULL REFERENCES organizations(id),
  order_id        VARCHAR(100)   NOT NULL,
  customer_id     VARCHAR(255),
  amount          NUMERIC(18,2)  NOT NULL CHECK (amount > 0),
  currency        VARCHAR(10)    NOT NULL DEFAULT 'INR',
  status          VARCHAR(50)    NOT NULL
                                 CHECK (status IN (
                                   'CREATED','PENDING_PAYMENT','PAYMENT_INITIATED',
                                   'PAYMENT_PROCESSING','PAID','PARTIALLY_PAID',
                                   'PAYMENT_FAILED','REFUNDED','PARTIALLY_REFUNDED',
                                   'CANCELLED','DISPUTED','COMPLETED','EXPIRED'
                                 )),
  items           JSONB          NOT NULL DEFAULT '[]',
  metadata        JSONB          NOT NULL DEFAULT '{}',
  version         INT            NOT NULL DEFAULT 1,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, order_id)
);
```

### webhook_events

```sql
CREATE TABLE webhook_events (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID          NOT NULL REFERENCES organizations(id),
  provider            VARCHAR(100)  NOT NULL,
  event_type          VARCHAR(255)  NOT NULL,
  provider_event_id   VARCHAR(255),
  payload_hash        VARCHAR(64)   NOT NULL,
  signature_verified  BOOLEAN       NOT NULL DEFAULT FALSE,
  signature_header    TEXT,
  signature_algorithm VARCHAR(50),
  payment_id          UUID          REFERENCES payments(id),
  order_id            UUID          REFERENCES orders(id),
  source_ip           INET,
  raw_payload         JSONB         NOT NULL,
  processing_status   VARCHAR(50)   NOT NULL DEFAULT 'RECEIVED'
                                    CHECK (processing_status IN (
                                      'RECEIVED','VERIFIED','PROCESSING',
                                      'PROCESSED','FAILED','IGNORED','DUPLICATE'
                                    )),
  retry_count         INT           NOT NULL DEFAULT 0,
  max_retries         INT           NOT NULL DEFAULT 5,
  last_error          TEXT,
  processed_at        TIMESTAMPTZ,
  next_retry_at       TIMESTAMPTZ,
  received_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
```

### ledger_entries

```sql
CREATE TABLE ledger_entries (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID           NOT NULL REFERENCES organizations(id),
  entry_id        VARCHAR(100)   NOT NULL,
  payment_id      UUID           REFERENCES payments(id),
  order_id        UUID           REFERENCES orders(id),
  settlement_id   UUID           REFERENCES settlements(id),
  entry_type      VARCHAR(100)   NOT NULL
                                 CHECK (entry_type IN (
                                   'PAYMENT_CREDIT','PAYMENT_DEBIT','REFUND_DEBIT',
                                   'SETTLEMENT_DEBIT','FEE_DEBIT','TAX_DEBIT',
                                   'ADJUSTMENT','REVERSAL','CHARGEBACK'
                                 )),
  account_code    VARCHAR(100)   NOT NULL,
  amount          NUMERIC(18,2)  NOT NULL,
  currency        VARCHAR(10)    NOT NULL DEFAULT 'INR',
  description     TEXT,
  reference_id    VARCHAR(255),
  status          VARCHAR(50)    NOT NULL DEFAULT 'PENDING'
                                 CHECK (status IN ('PENDING','POSTED','REVERSED','VOIDED')),
  posted_at       TIMESTAMPTZ,
  version         INT            NOT NULL DEFAULT 1,
  metadata        JSONB          NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, entry_id)
);
```

### journal_lines

```sql
CREATE TABLE journal_lines (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID           NOT NULL REFERENCES organizations(id),
  ledger_entry_id UUID           NOT NULL REFERENCES ledger_entries(id) ON DELETE CASCADE,
  account_code    VARCHAR(100)   NOT NULL,
  debit_amount    NUMERIC(18,2)  NOT NULL DEFAULT 0 CHECK (debit_amount >= 0),
  credit_amount   NUMERIC(18,2)  NOT NULL DEFAULT 0 CHECK (credit_amount >= 0),
  currency        VARCHAR(10)    NOT NULL DEFAULT 'INR',
  description     TEXT,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_journal_one_side CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR
    (credit_amount > 0 AND debit_amount = 0)
  )
);
```

### settlements

```sql
CREATE TABLE settlements (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID           NOT NULL REFERENCES organizations(id),
  settlement_id   VARCHAR(100)   NOT NULL,
  provider        VARCHAR(100)   NOT NULL,
  gross_amount    NUMERIC(18,2)  NOT NULL,
  fee_amount      NUMERIC(18,2)  NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(18,2)  NOT NULL DEFAULT 0,
  net_amount      NUMERIC(18,2)  NOT NULL,
  currency        VARCHAR(10)    NOT NULL DEFAULT 'INR',
  status          VARCHAR(50)    NOT NULL DEFAULT 'PENDING'
                                 CHECK (status IN (
                                   'PENDING','PROCESSING','SETTLED',
                                   'ON_HOLD','FAILED','REVERSED'
                                 )),
  settlement_date DATE,
  utr_number      VARCHAR(255),
  bank_reference  VARCHAR(255),
  payment_count   INT            NOT NULL DEFAULT 0,
  expected_amount NUMERIC(18,2),
  metadata        JSONB          NOT NULL DEFAULT '{}',
  version         INT            NOT NULL DEFAULT 1,
  settled_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, settlement_id)
);
```

### settlement_payments

```sql
CREATE TABLE settlement_payments (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID           NOT NULL REFERENCES organizations(id),
  settlement_id   UUID           NOT NULL REFERENCES settlements(id),
  payment_id      UUID           NOT NULL REFERENCES payments(id),
  amount          NUMERIC(18,2)  NOT NULL,
  fee_amount      NUMERIC(18,2)  NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE (settlement_id, payment_id)
);
```

### incidents

```sql
CREATE TABLE incidents (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID         NOT NULL REFERENCES organizations(id),
  incident_number VARCHAR(100) NOT NULL,
  title           VARCHAR(500) NOT NULL,
  rule_ids        TEXT[]       NOT NULL DEFAULT '{}',
  severity        VARCHAR(20)  NOT NULL
                               CHECK (severity IN ('CRITICAL','HIGH','MEDIUM','LOW','INFO')),
  status          VARCHAR(50)  NOT NULL DEFAULT 'OPEN'
                               CHECK (status IN (
                                 'OPEN','INVESTIGATING','RESOLVED','DISMISSED','ESCALATED'
                               )),
  payment_id      UUID         REFERENCES payments(id),
  order_id        UUID         REFERENCES orders(id),
  webhook_id      UUID         REFERENCES webhook_events(id),
  ledger_entry_id UUID         REFERENCES ledger_entries(id),
  settlement_id   UUID         REFERENCES settlements(id),
  detected_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ,
  metadata        JSONB        NOT NULL DEFAULT '{}',
  version         INT          NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, incident_number)
);
```

### investigations

```sql
CREATE TABLE investigations (
  id                           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id              UUID          NOT NULL REFERENCES organizations(id),
  incident_id                  UUID          REFERENCES incidents(id),
  investigation_type           VARCHAR(100)  NOT NULL,
  requested_by                 UUID          NOT NULL REFERENCES users(id),
  status                       VARCHAR(50)   NOT NULL DEFAULT 'PENDING'
                                             CHECK (status IN (
                                               'PENDING','RUNNING','COMPLETED','FAILED','CANCELLED'
                                             )),
  input_fingerprint            VARCHAR(64)   NOT NULL,
  evidence_version_fingerprint VARCHAR(64),
  result                       JSONB,
  ai_used                      BOOLEAN       NOT NULL DEFAULT FALSE,
  model_version                VARCHAR(100),
  prompt_version               VARCHAR(50),
  token_count_input            INT,
  token_count_output           INT,
  validation_status            VARCHAR(50),
  error_message                TEXT,
  duration_ms                  INT,
  expires_at                   TIMESTAMPTZ,
  created_at                   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
```

### audit_events

```sql
CREATE TABLE audit_events (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID          NOT NULL REFERENCES organizations(id),
  user_id         UUID          REFERENCES users(id),
  correlation_id  VARCHAR(100),
  action          VARCHAR(255)  NOT NULL,
  resource_type   VARCHAR(100),
  resource_id     VARCHAR(255),
  outcome         VARCHAR(50)   NOT NULL
                                CHECK (outcome IN ('SUCCESS','FAILURE','DENIED','ERROR')),
  ip_address      INET,
  user_agent      TEXT,
  details         JSONB         NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
```

### outbox_events

```sql
CREATE TABLE outbox_events (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  aggregate_type  VARCHAR(100)  NOT NULL,
  aggregate_id    VARCHAR(255)  NOT NULL,
  event_type      VARCHAR(255)  NOT NULL,
  payload         JSONB         NOT NULL,
  status          VARCHAR(50)   NOT NULL DEFAULT 'PENDING'
                                CHECK (status IN ('PENDING','PUBLISHED','FAILED','DEAD')),
  retry_count     INT           NOT NULL DEFAULT 0,
  max_retries     INT           NOT NULL DEFAULT 5,
  last_error      TEXT,
  next_retry_at   TIMESTAMPTZ,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
```

## 9.3 All Indexes

```sql
-- sessions
CREATE INDEX idx_sessions_token   ON sessions (token_hash) WHERE revoked_at IS NULL;
CREATE INDEX idx_sessions_user    ON sessions (user_id, expires_at);
CREATE INDEX idx_sessions_cleanup ON sessions (expires_at) WHERE revoked_at IS NULL;

-- payments
CREATE INDEX idx_payments_org          ON payments (organization_id);
CREATE INDEX idx_payments_org_pid      ON payments (organization_id, payment_id);
CREATE INDEX idx_payments_org_status   ON payments (organization_id, status);
CREATE INDEX idx_payments_org_order    ON payments (organization_id, order_id);
CREATE INDEX idx_payments_created      ON payments (organization_id, created_at DESC);
CREATE INDEX idx_payments_provider_ref ON payments (organization_id, provider_reference_id)
                                        WHERE provider_reference_id IS NOT NULL;
CREATE INDEX idx_payments_method       ON payments (organization_id, payment_method, status);
CREATE INDEX idx_payments_idempotency  ON payments (organization_id, idempotency_key)
                                        WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_payments_failed_at    ON payments (organization_id, failed_at DESC)
                                        WHERE status = 'FAILED';

-- orders
CREATE INDEX idx_orders_org        ON orders (organization_id);
CREATE INDEX idx_orders_org_oid    ON orders (organization_id, order_id);
CREATE INDEX idx_orders_org_status ON orders (organization_id, status);

-- webhook_events
CREATE INDEX idx_webhooks_org      ON webhook_events (organization_id);
CREATE INDEX idx_webhooks_payment  ON webhook_events (organization_id, payment_id);
CREATE INDEX idx_webhooks_status   ON webhook_events (organization_id, processing_status);
CREATE INDEX idx_webhooks_retry    ON webhook_events (next_retry_at)
                                    WHERE processing_status IN ('RECEIVED','FAILED');
CREATE INDEX idx_webhooks_received ON webhook_events (organization_id, received_at DESC);

-- ledger_entries
CREATE INDEX idx_ledger_org        ON ledger_entries (organization_id);
CREATE INDEX idx_ledger_payment    ON ledger_entries (organization_id, payment_id);
CREATE INDEX idx_ledger_status     ON ledger_entries (organization_id, status);
CREATE INDEX idx_ledger_type       ON ledger_entries (organization_id, entry_type);
CREATE INDEX idx_ledger_settlement ON ledger_entries (organization_id, settlement_id);

-- journal_lines
CREATE INDEX idx_journal_entry ON journal_lines (organization_id, ledger_entry_id);

-- settlements
CREATE INDEX idx_settlements_org    ON settlements (organization_id);
CREATE INDEX idx_settlements_status ON settlements (organization_id, status);
CREATE INDEX idx_settlements_date   ON settlements (organization_id, settlement_date);

-- incidents
CREATE INDEX idx_incidents_org      ON incidents (organization_id);
CREATE INDEX idx_incidents_severity ON incidents (organization_id, severity, detected_at DESC);
CREATE INDEX idx_incidents_status   ON incidents (organization_id, status);
CREATE INDEX idx_incidents_payment  ON incidents (organization_id, payment_id);
CREATE INDEX idx_incidents_detected ON incidents (organization_id, detected_at DESC);

-- investigations
CREATE INDEX idx_investigations_org      ON investigations (organization_id, created_at DESC);
CREATE INDEX idx_investigations_fp       ON investigations (organization_id, input_fingerprint);
CREATE INDEX idx_investigations_incident ON investigations (organization_id, incident_id);

-- audit_events
CREATE INDEX idx_audit_org      ON audit_events (organization_id, created_at DESC);
CREATE INDEX idx_audit_user     ON audit_events (user_id, created_at DESC);
CREATE INDEX idx_audit_resource ON audit_events (organization_id, resource_type, resource_id);

-- outbox_events
CREATE INDEX idx_outbox_pending ON outbox_events (next_retry_at)
                                  WHERE status IN ('PENDING','FAILED');
```

## 9.4 Shared Triggers

```sql
CREATE OR REPLACE FUNCTION trg_refresh_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_increment_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply both triggers to: payments, orders, ledger_entries,
-- settlements, incidents, investigations, organizations, users
-- (apply trg_refresh_updated_at before trg_increment_version on each table)
```

## 9.5 Row-Level Security Policies

```sql
ALTER TABLE payments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines       ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements         ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE investigations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events        ENABLE ROW LEVEL SECURITY;

-- Apply this policy pattern to every table above:
CREATE POLICY org_isolation ON payments
  USING (organization_id = current_setting('app.organization_id', true)::UUID);
```

The API sets context transaction-locally: `SET LOCAL "app.organization_id" = '<verified-uuid>';`

---

# 10. Incident Detection Rules

Rules are organized into 8 categories. The deterministic engine evaluates all applicable rules. AI is called only for rules marked **Yes** in the AI column.

All thresholds (30min, 3 days, 5min, etc.) are loaded from `config.incidentEngine` — not hardcoded.

| ID | Category | Condition | Finding | Severity | AI? |
|---|---|---|---|---|---|
| **R001** | POM | `payment.status = SUCCESS` AND `order.status = PENDING` | Provider success but order not updated | HIGH | No |
| **R002** | POM | `payment.status = SUCCESS` AND `order.status = PAYMENT_FAILED` | Provider success contradicts order failure | CRITICAL | No |
| **R003** | POM | `payment.status = SUCCESS` AND `order.status = CANCELLED` | Payment captured on a cancelled order | CRITICAL | No |
| **R004** | POM | `payment.status IN (FAILED, CANCELLED)` AND `order.status = PAID` | Order marked paid with no successful payment | CRITICAL | No |
| **R005** | POM | `payment.status = PENDING` AND `age > pendingThreshold` | Payment stuck in PENDING beyond threshold | MEDIUM | No |
| **R006** | POM | `payment.amount > order.amount + 0.01` | Overpayment: payment exceeds order total | HIGH | No |
| **R007** | POM | `payment.amount < order.amount - 0.01` AND `payment.status = SUCCESS` | Underpayment: captured amount below order total | HIGH | No |
| **R008** | POM | `payment.currency != order.currency` | Currency mismatch between payment and order | HIGH | No |
| **R009** | POM | `SUM(successful payments for order) > order.amount * 1.01` | Over-collection: excess payments against order | CRITICAL | No |
| **R010** | POM | `COUNT(payments WHERE status=SUCCESS AND order_id=X) > 1` | Multiple successful payments for same order | CRITICAL | No |
| **R011** | WHK | Webhook verified AND not processed AND age > webhookUnprocessedThreshold | Verified webhook not processed within threshold | HIGH | No |
| **R012** | WHK | `signature_verified = false` AND `processing_status = PROCESSED` | Unverified webhook was processed | CRITICAL | No |
| **R013** | WHK | `COUNT(PROCESSED WHERE provider_event_id=X) > 1` | Duplicate webhook processing | HIGH | No |
| **R014** | WHK | `payment_id IS NULL` AND `event_type LIKE 'payment.%'` | Webhook received with no matching payment | HIGH | No |
| **R015** | WHK | `event_type = 'payment.captured'` AND `payment.status = FAILED` | Webhook confirms capture but payment record shows failure | CRITICAL | No |
| **R016** | WHK | `retry_count > max_retries` | Webhook retry storm: max retries exceeded | MEDIUM | No |
| **R017** | WHK | `age > 2hr` AND `processing_status = RECEIVED` | Severely delayed webhook delivery | MEDIUM | No |
| **R018** | WHK | `event_type = 'payment.captured'` AND `payment.status IN (PENDING, PROCESSING)` AND age < 1min | Fresh capture webhook but payment status not yet updated | LOW | No |
| **R019** | WHK | `event_type = 'payment.failed'` AND `payment.status = SUCCESS` | Webhook confirms failure but payment record shows success | CRITICAL | No |
| **R020** | WHK | `webhook.received_at > settlement.settled_at` AND `settlement.status = SETTLED` | Late webhook for already-settled payment | INFO | No |
| **R021** | LDG | `payment.status = SUCCESS` AND no ledger entry for this payment | Successful payment has no ledger entry | CRITICAL | No |
| **R022** | LDG | `ledger.status = POSTED` AND `payment.status IN (FAILED, CANCELLED, EXPIRED)` | Ledger entry exists for failed or cancelled payment | CRITICAL | No |
| **R023** | LDG | `ledger.amount != payment.amount` AND `entry_type = PAYMENT_CREDIT` | Ledger amount does not match payment amount | CRITICAL | No |
| **R024** | LDG | `COUNT(POSTED PAYMENT_CREDIT entries for payment) > 1` | Duplicate ledger posting for same payment | CRITICAL | No |
| **R025** | LDG | `ledger.status = PENDING` AND age > 1hr | Ledger entry stuck in PENDING | MEDIUM | No |
| **R026** | LDG | `SUM(debit_amount) != SUM(credit_amount)` for a ledger entry's journal lines | Journal imbalance: debits ≠ credits | CRITICAL | No |
| **R027** | LDG | `account_code NOT IN allowedAccountCodes(organization_id)` | Ledger posted to unexpected account code | HIGH | No |
| **R028** | LDG | `ledger.status = REVERSED` AND `payment.status = SUCCESS` AND no reversal reason | Ledger reversed with no corresponding payment reversal | HIGH | No |
| **R029** | LDG | `entry_type = REFUND_DEBIT` AND `payment.status NOT IN (REFUNDED, PARTIALLY_REFUNDED)` | Refund ledger entry but payment not in refund status | HIGH | No |
| **R030** | LDG | `payment.status = SUCCESS` AND no FEE_DEBIT entry AND `payment.amount > feeThreshold` | Missing fee ledger entry for successful payment | MEDIUM | No |
| **R031** | STL | `payment.status = SUCCESS` AND `age > settlementMissingThreshold` AND no settlement record | Captured payment missing from settlement | HIGH | No |
| **R032** | STL | `settlement.net_amount != SUM(payment amounts - fees)` | Settlement net amount does not match constituent payments | CRITICAL | No |
| **R033** | STL | `settlement.status = SETTLED` AND a referenced payment has `status = PENDING` | Settled settlement includes a still-pending payment | CRITICAL | No |
| **R034** | STL | `settlement.settlement_date < TODAY` AND `settlement.status = PENDING` | Settlement past its expected date and still pending | MEDIUM | No |
| **R035** | STL | A `settlement_payments` record references a payment where `status = FAILED` | Failed payment included in a settlement | CRITICAL | No |
| **R036** | STL | `settlement.currency != payment.currency` | Settlement currency mismatch | HIGH | No |
| **R037** | STL | `COUNT(DISTINCT settlement_id WHERE payment_id=X) > 1` | Same payment appears in multiple settlements | CRITICAL | No |
| **R038** | STL | `settlement.status = SETTLED` AND `utr_number IS NULL` | Settlement marked SETTLED without a UTR number | HIGH | No |
| **R039** | XDM | `payment.status = SUCCESS` AND `order.status = PENDING` AND webhook not processed AND no ledger | Full pipeline stall across all downstream systems | CRITICAL | Yes |
| **R040** | XDM | `payment.status = SUCCESS` AND `order.status = PAID` AND webhook processed AND no settlement after threshold | Payment completed but no settlement record | HIGH | No |
| **R041** | XDM | `payment.status = FAILED` AND `order.status = PAID` | Impossible state: order paid with no successful payment | CRITICAL | Yes |
| **R042** | XDM | `payment.status = SUCCESS` AND webhook processed AND ledger posted AND `order.status = PENDING` | Webhook and ledger processed but order not updated | HIGH | Yes |
| **R043** | XDM | `payment.status IN (FAILED, CANCELLED)` AND a REFUND_DEBIT ledger entry exists | Refund ledger entry for a payment that was never successful | CRITICAL | No |
| **R044** | XDM | `payment.status = SUCCESS` AND ledger posted AND order paid AND no settlement | All pre-settlement steps done but settlement is missing | HIGH | No |
| **R045** | XDM | `payment.status = DISPUTED` AND no OPEN incident for this payment | Disputed payment without an open incident | HIGH | No |
| **R046** | XDM | `payment.status = CANCELLED` AND `ledger.status = POSTED` AND no REVERSAL entry | Cancelled payment with unreversed ledger posting | CRITICAL | No |
| **R047** | TMG | `payment.status = INITIATED` AND age > 15min AND no subsequent status event | Payment initiated with no status update | MEDIUM | No |
| **R048** | TMG | `payment.status = SUCCESS` AND `captured_at - initiated_at > 24hr` | Abnormally long capture latency | MEDIUM | No |
| **R049** | TMG | `webhook.processed_at < webhook.received_at` | Webhook processed before received_at (clock skew) | HIGH | No |
| **R050** | TMG | `ledger.posted_at < payment.captured_at` | Ledger posted before payment capture timestamp | CRITICAL | No |
| **R051** | TMG | `settlement.settled_at < payment.captured_at` | Settlement recorded before payment capture | CRITICAL | No |
| **R052** | RPD | `COUNT(FAILED in burstWindow) > burstCountThreshold` | Burst payment failure in window | HIGH | Yes |
| **R053** | RPD | `COUNT(FAILED by payment_method in methodWindow) > methodCountThreshold` | Recurring failure by payment method | MEDIUM | Yes |
| **R054** | RPD | `COUNT(FAILED by failure_code in burstWindow) > burstCountThreshold` | Recurring failure by error code | MEDIUM | Yes |
| **R055** | RPD | `COUNT(FAILED webhook events in stormWindow) > stormCountThreshold` | Webhook processing failure storm | HIGH | Yes |
| **R056** | RPD | `FAILED / (FAILED + SUCCESS) > failureRateThresholdPct / 100` in rolling 1hr | Payment failure rate above threshold | HIGH | Yes |
| **R057** | RPD | `AVG(captured_at - initiated_at) > 5min` in rolling 1hr | Slow payment processing pattern | MEDIUM | Yes |
| **R058** | RPD | `COUNT(FAILED by customer_id in 24hr) >= 3` | Same customer with 3+ failed payments in 24 hours | MEDIUM | Yes |
| **R059** | SEC | Same `idempotency_key` on two payments in same org with different amounts | Idempotency key reused with different amount | CRITICAL | No |
| **R060** | SEC | `COUNT(DISTINCT payments WHERE provider_reference_id=R) > 1` | Provider reference ID duplicated across payment records | CRITICAL | No |
| **R061** | SEC | `webhook.source_ip NOT IN allowedProviderIps(provider)` | Webhook from unexpected IP address | HIGH | No |
| **R062** | SEC | Payment amount at CAPTURED differs from amount at INITIATED (from audit trail) | Payment amount changed between initiation and capture | CRITICAL | No |
| **R063** | SEC | `refunded_amount > captured_amount` | Refund amount exceeds original captured amount | CRITICAL | No |

**Category Key:** POM = Payment-Order Mismatch · WHK = Webhook · LDG = Ledger · STL = Settlement · XDM = Cross-Domain · TMG = Timing Anomaly · RPD = Recurring Pattern · SEC = Security/Integrity

---

# 11. Evidence Package Contract

## 11.1 TypeScript Interfaces

```typescript
// packages/contracts/src/evidence-package.ts

export const EVIDENCE_MAX_BYTES = 32 * 1024;       // 32 KB hard limit
export const EVIDENCE_MAX_PATTERN_SAMPLES = 5;
export const EVIDENCE_MAX_ERROR_TEXT_LENGTH = 500;
export const EVIDENCE_MAX_FIELD_TEXT_LENGTH = 1_000;

export type InvestigationType =
  | 'payment_status'
  | 'payment_order_mismatch'
  | 'webhook_investigation'
  | 'ledger_discrepancy'
  | 'settlement_reconciliation'
  | 'cross_domain_incident'
  | 'recurring_failure_pattern'
  | 'security_anomaly';

export interface EvidencePackage {
  investigationId: string;
  investigationType: InvestigationType;
  triggeredRuleIds: string[];                 // e.g. ['R001', 'R021']
  evidenceVersionFingerprint: string;         // SHA-256 of sorted evidence versions
  assembledAt: string;                        // ISO 8601 UTC
  payment?: PaymentEvidence;
  order?: OrderEvidence;
  webhook?: WebhookEvidence;
  ledger?: LedgerEvidence;
  settlement?: SettlementEvidence;
  pattern?: PatternEvidence;
}

export interface PaymentEvidence {
  id: string;
  status: string;
  amount: number;
  currency: string;
  provider: string;
  paymentMethod: string;
  version: number;
  initiatedAt: string | null;
  capturedAt: string | null;
  failedAt: string | null;
  failureCode: string | null;
  // EXCLUDED: provider_reference_id, customer PII, raw_provider_response
}

export interface OrderEvidence {
  id: string;
  status: string;
  amount: number;
  currency: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookEvidence {
  id: string;
  eventType: string;
  signatureVerified: boolean;
  processingStatus: string;
  retryCount: number;
  receivedAt: string;
  processedAt: string | null;
  lastError: string | null;         // truncated to EVIDENCE_MAX_ERROR_TEXT_LENGTH
  // EXCLUDED: raw_payload, source_ip, signature_header
}

export interface LedgerEvidence {
  matchingEntryFound: boolean;
  entryId: string | null;
  entryType: string | null;
  entryAmount: number | null;
  entryStatus: string | null;
  amountMatchesPayment: boolean | null;
  journalBalanced: boolean | null;
  duplicateEntryCount: number;
}

export interface SettlementEvidence {
  matchingSettlementFound: boolean;
  settlementId: string | null;
  settlementStatus: string | null;
  amountMatches: boolean | null;
  settledAt: string | null;
  utrPresent: boolean;
  duplicateInSettlementsCount: number;
}

export interface PatternEvidence {
  windowHours: number;
  failureCount: number;
  failureRatePct: number;
  dominantFailureCode: string | null;
  dominantPaymentMethod: string | null;
  representativeSamples: Array<{
    paymentId: string;
    failureCode: string;
    failedAt: string;
  }>;   // max EVIDENCE_MAX_PATTERN_SAMPLES entries
}
```

## 11.2 Redaction Rules

The following are **never included** in the evidence package sent to Gemini:
- Full card PAN, CVV, expiry date.
- UPI VPA beyond first 3 characters (masked: `abc***@upi`).
- Customer name, email, phone, or address.
- Bank account number.
- Webhook raw payload content.
- Webhook signature header or HMAC secret.
- Network IP addresses.
- Provider credentials or API keys.
- `password_hash`, `mfa_secret_hash`, session tokens.

---

# 12. Synthetic Dataset

## 12.1 Tenant Organizations

| Org ID | Slug | Name | Purpose |
|---|---|---|---|
| ORG-001 | fastmart | FastMart | High-volume e-commerce; primary demo org |
| ORG-002 | quickeats | QuickEats | Food delivery; cross-tenant isolation demo only |

## 12.2 Users

| User | Email | Role | Org |
|---|---|---|---|
| USR-001 | admin@fastmart.com | owner | ORG-001 |
| USR-002 | analyst@fastmart.com | analyst | ORG-001 |
| USR-003 | viewer@fastmart.com | viewer | ORG-001 |
| USR-004 | admin@quickeats.com | owner | ORG-002 |

Seeded passwords: `Synthetic@2024!` (bcrypt-hashed in seed scripts only; never in code).

## 12.3 Scenario Matrix (all 63 rules covered)

| SC | Payment | Order | Rules Triggered | Description |
|---|---|---|---|---|
| SC-01 | PAY-10001 | ORD-20001 | R001, R021 | Provider SUCCESS, order PENDING, no ledger |
| SC-02 | PAY-10002 | ORD-20002 | R002 | Provider SUCCESS, order PAYMENT_FAILED |
| SC-03 | PAY-10003 | ORD-20003 | R003 | Payment captured on cancelled order |
| SC-04 | PAY-10004 | ORD-20004 | R004, R041 | Order PAID, payment FAILED |
| SC-05 | PAY-10005 | ORD-20005 | R005, R047 | Payment PENDING 72 min, INITIATED 20 min, no update |
| SC-06 | PAY-10006 | ORD-20006 | R006 | Payment INR 1050, order INR 1000 (overpayment) |
| SC-07 | PAY-10007 | ORD-20007 | R007 | Payment INR 900, order INR 1000 (underpayment) |
| SC-08 | PAY-10008 | ORD-20008 | R008 | Payment USD, order INR |
| SC-09 | PAY-10009+010 | ORD-20009 | R009, R010 | Two SUCCESS payments for same order |
| SC-10 | PAY-10010 | — | R011 | Webhook verified, not processed, 10 min old |
| SC-11 | PAY-10011 | — | R012 | Webhook signature_verified=false, status=PROCESSED |
| SC-12 | PAY-10012 | — | R013 | Provider event id WHK-EVT-99 processed 3 times |
| SC-13 | PAY-10013 | — | R014 | Webhook event_type=payment.captured, payment_id null |
| SC-14 | PAY-10014 | — | R015 | Webhook=payment.captured, payment=FAILED |
| SC-15 | PAY-10015 | — | R016 | Webhook retry_count=6, max_retries=5 |
| SC-16 | PAY-10016 | — | R017 | Webhook received 3hr ago, processing_status=RECEIVED |
| SC-17 | PAY-10017 | — | R018 | Fresh capture webhook (30sec old), payment=PROCESSING |
| SC-18 | PAY-10018 | — | R019 | Webhook=payment.failed, payment=SUCCESS |
| SC-19 | PAY-10019 | — | R020 | Webhook received 2 days after settlement settled |
| SC-20 | PAY-10020 | — | R021 | SUCCESS payment, no ledger entry |
| SC-21 | PAY-10021 | — | R022 | Ledger POSTED, payment FAILED |
| SC-22 | PAY-10022 | — | R023 | Ledger amount INR 999, payment INR 1000 |
| SC-23 | PAY-10023 | — | R024 | Two POSTED PAYMENT_CREDIT entries for same payment |
| SC-24 | PAY-10024 | — | R025 | Ledger PENDING for 90 min |
| SC-25 | PAY-10025 | — | R026 | Journal debit=1000, credit=950 (imbalanced) |
| SC-26 | PAY-10026 | — | R027 | Ledger account_code='UNKNOWN_ACCT' |
| SC-27 | PAY-10027 | — | R028 | Ledger REVERSED, payment SUCCESS, no reversal reason |
| SC-28 | PAY-10028 | — | R029 | REFUND_DEBIT entry, payment SUCCESS (not refunded) |
| SC-29 | PAY-10029 | — | R030 | SUCCESS payment, no FEE_DEBIT entry |
| SC-30 | PAY-10030 | — | R031 | SUCCESS payment captured 4 days ago, not in settlement |
| SC-31 | STL-001 | — | R032 | Settlement net=INR 9500, sum of payments=INR 10000 |
| SC-32 | STL-002 | — | R033 | Settlement SETTLED, one payment still PENDING |
| SC-33 | STL-003 | — | R034 | Settlement date yesterday, status PENDING |
| SC-34 | STL-004 | — | R035 | Settlement includes a FAILED payment |
| SC-35 | STL-005 | — | R036 | Settlement currency USD, payment currency INR |
| SC-36 | PAY-10036 | — | R037 | Payment in both STL-006 and STL-007 |
| SC-37 | STL-008 | — | R038 | Settlement SETTLED, utr_number null |
| SC-38 | PAY-10038 | ORD-20038 | R039 | Full pipeline stall: SUCCESS + PENDING + WHK unprocessed + no ledger |
| SC-39 | PAY-10039 | ORD-20039 | R040, R044 | SUCCESS + PAID + WHK processed + no settlement 3d |
| SC-40 | PAY-10040 | ORD-20040 | R041 | Payment FAILED, order PAID |
| SC-41 | PAY-10041 | ORD-20041 | R042 | SUCCESS + WHK processed + ledger posted + order PENDING |
| SC-42 | PAY-10042 | — | R043 | REFUND_DEBIT entry, payment FAILED |
| SC-43 | PAY-10043 | — | R045 | Payment DISPUTED, no open incident |
| SC-44 | PAY-10044 | — | R046 | Payment CANCELLED, ledger POSTED, no REVERSAL |
| SC-45 | PAY-10045 | — | R047 | INITIATED 20 min ago, no status update |
| SC-46 | PAY-10046 | — | R048 | captured_at - initiated_at = 26 hours |
| SC-47 | WHK-30047 | — | R049 | processed_at = received_at - 30sec (clock skew) |
| SC-48 | LED-10048 | — | R050 | Ledger posted_at < payment captured_at by 5 min |
| SC-49 | STL-009 | — | R051 | Settlement settled_at < payment captured_at by 2hr |
| SC-50 | PAY-10050..054 | — | R052, R056 | 5 FAILED payments in 45 min, same merchant |
| SC-51 | PAY-10055..060 | — | R053 | 6 FAILED card payments over 5 hours |
| SC-52 | PAY-10061..064 | — | R054 | 4 FAILED payments with code INSUFFICIENT_FUNDS in 1hr |
| SC-53 | WHK-30053..064 | — | R055 | 12 webhook processing failures in 10 min |
| SC-54 | PAY-10065..067 | — | R057 | Avg capture latency = 7 min in current hour |
| SC-55 | PAY-10068..070 | — | R058 | 3 FAILED payments from CUST-007 in 20 hours |
| SC-56 | PAY-10071+072 | — | R059 | Idempotency key IK-999 used with INR 500 and INR 750 |
| SC-57 | PAY-10073+074 | — | R060 | Same provider_reference_id on two payment records |
| SC-58 | WHK-30058 | — | R061 | Webhook source_ip=203.0.113.99 (not in allowlist) |
| SC-59 | PAY-10075 | — | R062 | Amount changed: INITIATED=1000, CAPTURED=1200 |
| SC-60 | PAY-10076 | — | R063 | refunded_amount=1100, captured_amount=1000 |
| SC-61 | PAY-10077 | ORD-20077 | None | Happy path: SUCCESS + PAID + WHK PROCESSED + ledger POSTED + STL SETTLED + UTR present |
| SC-62 | PAY-10078 | ORD-20078 | None | Clean failure: FAILED + PAYMENT_FAILED + WHK PROCESSED (failure event) |

## 12.4 Seed File Structure

```
database/seeds/
├── 00_organizations.sql
├── 01_users.sql
├── 02_memberships.sql
├── 10_orders.sql
├── 11_payments.sql
├── 12_webhook_events.sql
├── 13_ledger_entries.sql
├── 14_journal_lines.sql
├── 15_settlements.sql
├── 16_settlement_payments.sql
├── 17_incidents.sql
└── README.md              — maps each SC-xx to the file row(s) it seeds
```

---

# 13. Caching Strategy

## 13.1 Frontend Cache (TanStack Query)

Cache key construction always includes user ID and active organization ID:

```typescript
// apps/web/src/lib/query-keys.ts

export const queryKeys = {
  payments: {
    all: (organizationId: string) => ['payments', organizationId] as const,
    list: (organizationId: string, filters: PaymentListFilters) =>
      ['payments', organizationId, 'list', filters] as const,
    detail: (organizationId: string, paymentId: string) =>
      ['payments', organizationId, 'detail', paymentId] as const,
    timeline: (organizationId: string, paymentId: string) =>
      ['payments', organizationId, 'timeline', paymentId] as const,
  },
  incidents: {
    all: (organizationId: string) => ['incidents', organizationId] as const,
    detail: (organizationId: string, incidentId: string) =>
      ['incidents', organizationId, 'detail', incidentId] as const,
  },
  investigations: {
    detail: (organizationId: string, investigationId: string) =>
      ['investigations', organizationId, 'detail', investigationId] as const,
  },
  analytics: {
    paymentStats: (organizationId: string, range: DateRange) =>
      ['analytics', organizationId, 'payment-stats', range] as const,
  },
} as const;
```

On organization change or logout: `queryClient.removeQueries()` clears all cached state. Never retain cross-tenant data in the query cache.

## 13.2 Backend In-Process LRU Cache

```typescript
// apps/api/src/infrastructure/cache/lru-cache.ts

import { LRUCache } from 'lru-cache';

import { config } from '../../config/index.js';

interface CacheEntry<T> {
  value: T;
  organizationId: string;
  evidenceVersionFingerprint?: string;
  storedAt: number;
  expiresAt: number;
}

// Single bounded cache — no unbounded growth
export const applicationCache = new LRUCache<string, CacheEntry<unknown>>({
  max: config.cache.maxEntries,
  ttl: config.cache.paymentStatusTtlMs,  // default TTL; overridden per entry
});

export function buildPaymentCacheKey(organizationId: string, paymentId: string): string {
  return `payment:${organizationId}:${paymentId}`;
}

export function buildInvestigationCacheKey(
  organizationId: string,
  inputFingerprint: string,
): string {
  return `investigation:${organizationId}:${inputFingerprint}`;
}
```

## 13.3 Cache Invalidation via Outbox

```
Webhook received
      |
      v
Verify signature + validate event
      |
      v
Update payment state (PostgreSQL transaction)
      |
      v
Insert outbox_event in same transaction
      |
      v
Commit transaction
      |
      v
Outbox worker polls, publishes invalidation
      |
      v
Invalidate cache entry for affected payment
```

A PostgreSQL transaction does not make a write to the database and a cache invalidation automatically atomic. The outbox pattern ensures the invalidation is durable and survives process crashes.

## 13.4 Data Freshness Policies

| Data | TTL | Invalidation trigger |
|---|---|---|
| Payment status | `CACHE_PAYMENT_STATUS_TTL_MS` | Outbox event on any payment update |
| Investigation result | `CACHE_INVESTIGATION_TTL_MS` | Evidence version fingerprint change |
| Ledger balance | Always authoritative DB query | Not cached |
| Recovery eligibility | Never cached | Always revalidate immediately |
| User permissions | Validated per request from `sessions` table | Session revocation |
| Organization config | `CACHE_CONFIG_TTL_MS` | Manual invalidation or restart |

---

# 14. Single-Flight Request Deduplication

Identical concurrent investigations share one computation.

```typescript
// apps/api/src/infrastructure/cache/in-flight-map.ts

type InFlightKey = string;
type InFlightValue<T> = Promise<T>;

const inFlightMap = new Map<InFlightKey, InFlightValue<unknown>>();
const MAX_IN_FLIGHT_ENTRIES = 200;

export async function withSingleFlight<T>(
  key: InFlightKey,
  computeFn: () => Promise<T>,
): Promise<T> {
  const existing = inFlightMap.get(key);
  if (existing !== undefined) {
    return existing as Promise<T>;
  }

  if (inFlightMap.size >= MAX_IN_FLIGHT_ENTRIES) {
    // Shed load rather than accept unbounded in-flight entries
    throw new TooManyConcurrentInvestigationsError();
  }

  const computation = computeFn().finally(() => {
    inFlightMap.delete(key);
  });

  inFlightMap.set(key, computation);
  return computation;
}
```

The deduplication key must include: tenant ID, resource ID, investigation type, normalized parameters, evidence version fingerprint, and the prompt version. Every waiting request is independently authorized before receiving the shared result.

---

# 15. Request Lifecycle

```
 1. Receive request
 2. Authenticate user (session lookup in PostgreSQL)
 3. Resolve organization membership and role from session
 4. Validate and normalize request (Zod schema)
 5. Classify request type (deterministic application logic — no LLM)

 ┌── Simple status / data request
 │       Check authorized cache
 │       ├── Cache hit  → return verified structured data
 │       └── Cache miss → indexed DB query → update cache → return
 │
 └── Investigation request
         Check valid investigation cache
         ├── Cache hit (fingerprint match, not expired) → return validated result
         └── Cache miss
                 Check in-flight single-flight map
                 ├── Running → await shared result
                 └── New
                         Retrieve scoped authorized evidence
                         Run deterministic rule checks (all applicable rules)
                         AI needed and permitted?
                         ├── No  → Rule-based diagnosis only
                         └── Yes → Build minimal evidence package (≤ 32 KB)
                                   → Call Gemini with configured model
                                   → Validate response with Zod schema
                                   → Verify every evidence reference
                         Store validated result with evidence fingerprint
                         Return response
```

Authorization happens before any cached data is returned. A cache hit never bypasses access control.

---

# 16. Secured API Endpoints

## 16.1 Security Controls Applied to Every Endpoint

| Control | Mechanism |
|---|---|
| Authentication | `Authorization: Bearer <token>` header; validated against `sessions` table |
| Organization scope | `X-Organization-ID` header accepted but never trusted; resolved from authenticated session |
| HTTPS | HTTP requests rejected; enforced at reverse proxy |
| CORS | Origin allowlist from `config.app.allowedOrigins`; credentials only on known origins |
| Rate limiting | Per user, per org, per IP; all limits from `config.rateLimits` |
| Request body size | 64 KB default; 256 KB for webhook inbound |
| Input validation | Zod schema on every request body, path param, and query string |
| Output validation | Zod schema on every AI-sourced or cached response before it reaches the client |
| Audit logging | Every authenticated state-changing request writes an `audit_events` row |
| Tenant scoping | Every DB query includes `WHERE organization_id = :verifiedOrgId` |
| Security headers | HSTS, X-Content-Type-Options, X-Frame-Options, CSP, Referrer-Policy |
| Error format | RFC 7807 Problem Details: `{ type, title, status, detail, instance }` |

## 16.2 HTTP Status Code Reference

| Code | Meaning |
|---|---|
| 200 | Success with body |
| 201 | Resource created |
| 204 | Success, no body |
| 400 | Validation error — malformed or invalid request |
| 401 | Authentication required or token expired |
| 403 | Authenticated user lacks permission |
| 404 | Resource not found in authorized scope |
| 409 | Conflict (duplicate key, concurrent update) |
| 422 | Semantic validation failure (business rule violated) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
| 502 | AI provider unavailable |
| 503 | Service temporarily unavailable |

## 16.3 Authentication Endpoints

### POST /api/v1/auth/login
- **Auth:** None · **Rate limit:** `authLoginPerMinute` per IP
- **Body:** `{ email: string; password: string }`
- **200:** `{ token: string; expiresAt: string; user: { id: string; displayName: string; email: string } }`
- **401:** Invalid credentials · **423:** Account locked
- **Security:** Constant-time password comparison; increment `failed_login_count`; lock after `maxFailedLoginAttempts`; log IP and outcome to audit.

### POST /api/v1/auth/logout
- **Auth:** Bearer token · **Rate limit:** 30/min
- **204:** Session revoked (`sessions.revoked_at` set)

### POST /api/v1/auth/refresh
- **Auth:** Bearer token (near-expiry accepted) · **Rate limit:** 10/min
- **200:** `{ token: string; expiresAt: string }`

### GET /api/v1/auth/me
- **Auth:** Bearer token
- **200:** `{ id: string; displayName: string; email: string; organizations: Array<{ id: string; slug: string; name: string; role: string }> }`

## 16.4 Organization Endpoints

All organization routes require membership in `:orgId` resolved from session.

### GET /api/v1/organizations/:orgId
- **Role:** any member · **200:** `{ id, slug, name, plan, status, createdAt }`

### GET /api/v1/organizations/:orgId/members
- **Role:** owner | admin · **200:** `{ members: Array<{ userId, displayName, email, role, acceptedAt }> }`

### POST /api/v1/organizations/:orgId/members/invite
- **Role:** owner | admin · **Rate limit:** 10/min per org
- **Body:** `{ email: string; role: 'analyst' | 'viewer' }`
- **201:** `{ membershipId: string; invited: true }` · Audit: invite logged

### PATCH /api/v1/organizations/:orgId/members/:userId
- **Role:** owner only (cannot demote self)
- **Body:** `{ role: 'admin' | 'analyst' | 'viewer' }` · **200:** `{ updated: true }`

### DELETE /api/v1/organizations/:orgId/members/:userId
- **Role:** owner only (cannot remove self) · **204**

## 16.5 Payment Endpoints

### GET /api/v1/payments
- **Auth:** Bearer + any member · **Rate limit:** 120/min
- **Query:** `status?`, `from?`, `to?`, `paymentMethod?`, `page?`, `limit?` (max 100)
- **200:** `{ data: Payment[]; pagination: { page, limit, total, hasMore } }`
- **Security:** `organization_id` from session only; no client-supplied org filter accepted.

### GET /api/v1/payments/:paymentId
- **Auth:** Bearer + any member · **Rate limit:** 200/min
- **Cache:** Backend LRU; invalidated via outbox on any payment update
- **200:** Full payment object (`providerReferenceId` excluded for `viewer` role)
- **404:** Not found in org scope

### GET /api/v1/payments/:paymentId/timeline
- **Auth:** Bearer + any member · **Rate limit:** 60/min
- **200:** `{ paymentId: string; events: Array<{ event, timestamp, details }> }`

### GET /api/v1/payments/:paymentId/webhooks
- **Auth:** Bearer + owner | admin | analyst · **Rate limit:** 60/min
- **200:** Array of webhook events (`rawPayload` visible to owner/admin only)

### GET /api/v1/payments/:paymentId/ledger
- **Auth:** Bearer + owner | admin | analyst
- **200:** Ledger entries and journal lines for this payment

### GET /api/v1/payments/:paymentId/settlement
- **Auth:** Bearer + owner | admin | analyst
- **200:** Settlement record(s) referencing this payment

## 16.6 Order Endpoints

### GET /api/v1/orders
- **Auth:** Bearer + any member · **Rate limit:** 120/min
- **Query:** `status?`, `from?`, `to?`, `page?`, `limit?`
- **200:** Paginated order list

### GET /api/v1/orders/:orderId
- **Auth:** Bearer + any member · **200:** Order object

### GET /api/v1/orders/:orderId/payments
- **Auth:** Bearer + any member · **200:** Payments linked to this order

## 16.7 Investigation Endpoints

### POST /api/v1/investigations
- **Auth:** Bearer + owner | admin | analyst
- **Rate limit:** `investigationsPerUserPerMinute` per user; `investigationsPerOrgPerMinute` per org
- **Body:** `{ investigationType: InvestigationType; paymentId?: string; incidentId?: string }`
- **Processing:** Authenticate → verify payment belongs to org → compute fingerprint → check cache → check in-flight → run pipeline if needed
- **201:** `{ investigationId: string; status: string; result?: InvestigationResult; cached: boolean; aiUsed: boolean }`
- **429:** Too many concurrent investigations · Audit: logged with investigation type, AI usage, token counts

### GET /api/v1/investigations/:investigationId
- **Auth:** Bearer + must be requesting user's org
- **200:** Full investigation result with evidence metadata

### GET /api/v1/investigations
- **Auth:** Bearer + owner | admin | analyst
- **Query:** `incidentId?`, `type?`, `status?`, `from?`, `to?`, `page?`, `limit?`
- **200:** Paginated investigation list

## 16.8 Incident Endpoints

### GET /api/v1/incidents
- **Auth:** Bearer + any member · **Rate limit:** 120/min
- **Query:** `severity?`, `status?`, `ruleId?`, `from?`, `to?`, `page?`, `limit?`
- **200:** `{ data: Incident[]; pagination: { page, limit, total, hasMore } }`

### GET /api/v1/incidents/:incidentId
- **Auth:** Bearer + any member · **200:** Full incident with linked evidence IDs

### PATCH /api/v1/incidents/:incidentId
- **Auth:** Bearer + owner | admin | analyst
- **Body:** `{ status: 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED' | 'ESCALATED' }`
- **200:** Updated incident · Audit: status transition logged

### POST /api/v1/incidents/:incidentId/investigate
- **Auth:** Bearer + owner | admin | analyst · **Rate limit:** 10/min per incident
- **201:** New investigation for this incident

### GET /api/v1/incidents/:incidentId/investigations
- **Auth:** Bearer + owner | admin | analyst · **200:** Investigation list for incident

## 16.9 Webhook Inbound Endpoint

### POST /api/v1/webhooks/inbound/:provider
Where `:provider ∈ { razorpay, stripe, payu }`.

- **Auth:** None (public) — authentication is HMAC signature verification only
- **Rate limit:** 1000/min per provider
- **Max body:** 256 KB
- **Processing:**
  1. Hash raw body (SHA-256) and record as `payload_hash`.
  2. Identify org from provider-specific event payload field.
  3. Verify HMAC signature against `organizations.webhook_secret`.
  4. Persist `webhook_events` record with `signature_verified` set correctly.
  5. If signature invalid: persist as `RECEIVED` (unverified), return 200 — do not reveal verification outcome to caller.
  6. If duplicate `provider_event_id`: mark as `DUPLICATE`, return 200.
  7. Insert outbox event in the same transaction.
  8. Return 200 immediately — never block on downstream processing.
- **200 always:** `{ received: true }` — consistent response prevents retry pattern analysis.
- **Security:** Never log raw payload in plain text; reject payloads over 256 KB; validate timestamp freshness (reject events more than 5 min old).

### GET /api/v1/webhooks
- **Auth:** Bearer + owner | admin | analyst
- **Query:** `paymentId?`, `processingStatus?`, `from?`, `to?`, `page?`, `limit?`
- **200:** Paginated webhook list (`rawPayload` excluded for analyst/viewer)

### GET /api/v1/webhooks/:webhookId
- **Auth:** Bearer + owner | admin · **200:** Full webhook record (`rawPayload` for owner only)

## 16.10 Ledger Endpoints

### GET /api/v1/ledger/entries
- **Auth:** Bearer + owner | admin | analyst · **200:** Paginated ledger entries

### GET /api/v1/ledger/entries/:entryId
- **Auth:** Bearer + owner | admin | analyst · **200:** Ledger entry with journal lines

## 16.11 Settlement Endpoints

### GET /api/v1/settlements
- **Auth:** Bearer + owner | admin | analyst · **200:** Paginated settlement list

### GET /api/v1/settlements/:settlementId
- **Auth:** Bearer + owner | admin | analyst · **200:** Settlement (`utrNumber` visible to owner/admin only)

### GET /api/v1/settlements/:settlementId/payments
- **Auth:** Bearer + owner | admin | analyst · **200:** Payments in this settlement

## 16.12 Analytics Endpoints

### GET /api/v1/analytics/payment-stats
- **Auth:** Bearer + owner | admin | analyst · **Rate limit:** 30/min
- **Query:** `from?`, `to?`, `granularity?: 'hour' | 'day'`
- **200:**
```json
{
  "totalPayments": 250,
  "successCount": 220,
  "failureCount": 25,
  "pendingCount": 5,
  "totalVolume": 250000.00,
  "currency": "INR",
  "failureRatePct": 10.2,
  "series": [{ "period": "...", "success": 45, "failure": 5, "volume": 45000 }]
}
```

### GET /api/v1/analytics/incident-summary
- **Auth:** Bearer + owner | admin | analyst · **Rate limit:** 30/min
- **200:** `{ openCritical, openHigh, openMedium, resolvedToday, topRules: [{ ruleId, count, label }] }`

## 16.13 Audit Endpoint

### GET /api/v1/audit/events
- **Auth:** Bearer + role = owner only · **Rate limit:** 30/min
- **Query:** `userId?`, `action?`, `resourceType?`, `outcome?`, `from?`, `to?`, `page?`, `limit?`
- **200:** Paginated audit log (`ipAddress` excluded for non-owner)

## 16.14 Health Endpoints (unauthenticated)

### GET /health/live
- **200:** `{ status: "ok" }` — Kubernetes liveness probe

### GET /health/ready
- **200:** `{ status: "ready", db: "ok", cache: "ok" }` — readiness probe
- **503:** `{ status: "not_ready", db: "error" }`

---

# 17. Frontend Component Inventory

## 17.1 Libraries

| Library | Purpose |
|---|---|
| `shadcn/ui` | Core component primitives (Radix UI + Tailwind) |
| `lucide-react` | All icons — consistent, MIT-licensed SVG set |
| `recharts` | Charts — line, bar, area, pie; composable with Tailwind |
| `@tanstack/react-table` v8 | Sortable, filterable, paginated data tables |
| `@tanstack/react-query` v5 | Server-state cache, deduplication, invalidation |
| `react-hook-form` | Form state management |
| `zod` | Client-side schema validation |
| `sonner` | Toast notifications |
| `flowbite-react` | Timeline, stat cards, step indicators (supplements shadcn) |
| `date-fns` | Date formatting and arithmetic |
| `clsx` + `tailwind-merge` | Class name merging |

All libraries must be imported explicitly — no barrel imports that pull in unused code. Tree-shaking is verified in the CI build.

## 17.2 Page: Dashboard

| Component | Source | Role |
|---|---|---|
| `Card`, `CardHeader`, `CardContent` | shadcn/ui | Incident summary stat cards |
| `Badge` | shadcn/ui | Severity labels (CRITICAL=red, HIGH=orange, MEDIUM=yellow, INFO=blue) |
| `AreaChart`, `ResponsiveContainer` | recharts | Payment volume over 24h |
| `BarChart` | recharts | Failure rate by hour |
| `Timeline` | flowbite-react | Recent incidents feed |
| `Skeleton` | shadcn/ui | Loading state for all cards |
| `AlertTriangle` | lucide-react | Critical incident indicator |
| `TrendingDown` | lucide-react | Failure rate increase icon |
| `Activity` | lucide-react | Active investigation count |
| `CheckCircle2` | lucide-react | Resolved today count |
| `Tooltip` | recharts | Chart hover detail |

## 17.3 Page: Payments

| Component | Source | Role |
|---|---|---|
| DataTable (TanStack Table) | @tanstack/react-table | Payment list — sortable, filterable, paginated |
| `Input` | shadcn/ui | Payment ID search |
| `Select` | shadcn/ui | Status filter |
| `DatePickerWithRange` | shadcn/ui | Date range filter |
| `Badge` | shadcn/ui | Status chips |
| `Button` | shadcn/ui | Investigate action |
| `CreditCard` | lucide-react | Card payment method |
| `Smartphone` | lucide-react | UPI payment method |
| `Building2` | lucide-react | Net banking |
| `Wallet` | lucide-react | Wallet payment method |
| `ArrowUpDown` | lucide-react | Column sort indicator |
| `Loader2` | lucide-react | Loading spinner (animated) |

## 17.4 Page: Payment Detail

| Component | Source | Role |
|---|---|---|
| `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | shadcn/ui | Overview / Timeline / Webhooks / Ledger / Settlement |
| `Card` | shadcn/ui | Status summary |
| `Separator` | shadcn/ui | Section dividers |
| `Timeline` | flowbite-react | Payment event timeline |
| `CheckCircle2` | lucide-react | SUCCESS status |
| `XCircle` | lucide-react | FAILED status |
| `Clock` | lucide-react | PENDING status |
| `AlertCircle` | lucide-react | Warning / anomaly detected |
| `ShieldCheck` | lucide-react | Webhook signature verified |
| `ShieldX` | lucide-react | Webhook signature failed |
| `Tooltip` | shadcn/ui | Full ISO timestamp on hover |
| `Button` (primary) | shadcn/ui | Trigger investigation |

## 17.5 Page: Investigation Result

| Component | Source | Role |
|---|---|---|
| `Card` (neutral border) | shadcn/ui | Verified facts panel (deterministic data) |
| `Card` (amber border) | shadcn/ui | AI explanation panel — visually distinct from facts |
| `Alert`, `AlertTitle`, `AlertDescription` | shadcn/ui | Likely cause block |
| `Badge` (outline) | shadcn/ui | Evidence ID pills |
| `Badge` (destructive) | shadcn/ui | Missing evidence indicators |
| `Accordion` | shadcn/ui | Triggered rules list |
| `Table` | shadcn/ui | Rule ID / condition / finding table |
| `Bot` | lucide-react | AI explanation section header |
| `Database` | lucide-react | Verified facts section header |
| `FlaskConical` | lucide-react | Likely cause indicator |
| `Info` | lucide-react | Missing evidence / uncertainty |
| `RefreshCw` | lucide-react | Re-run investigation |
| `Skeleton` | shadcn/ui | Loading while investigation runs |
| `Progress` | shadcn/ui | Investigation running progress |

**Critical UI rule:** Verified deterministic facts and AI-generated explanations must be in visually distinct panels with explicit labels. AI output must never appear alongside verified facts without clear attribution and visual separation.

## 17.6 Page: Incidents

| Component | Source | Role |
|---|---|---|
| DataTable (TanStack Table) | @tanstack/react-table | Incident list |
| `Select` | shadcn/ui | Severity and status filters |
| `Input` | shadcn/ui | Rule ID search |
| `Badge` | shadcn/ui | Severity color coding |
| `Flame` | lucide-react | CRITICAL badge icon |
| `AlertTriangle` | lucide-react | HIGH badge icon |
| `AlertCircle` | lucide-react | MEDIUM badge icon |
| `Info` | lucide-react | LOW/INFO badge icon |
| `DropdownMenu` | shadcn/ui | Incident actions: Investigate / Resolve / Dismiss |
| `Dialog` | shadcn/ui | Confirm status change |
| `HoverCard` | shadcn/ui | Quick incident preview on row hover |

## 17.7 Page: Analytics

| Component | Source | Role |
|---|---|---|
| `AreaChart`, `ResponsiveContainer` | recharts | Payment volume (hourly) |
| `BarChart` | recharts | Failure rate by hour |
| `LineChart` | recharts | Average capture latency |
| `PieChart` | recharts | Payment method distribution |
| `BarChart` | recharts | Top triggered rules |
| `Card` | shadcn/ui | Total volume, success rate, active incidents |
| `DatePickerWithRange` | shadcn/ui | Analytics time range |
| `Select` | shadcn/ui | Granularity (hour / day) |
| `TrendingUp` / `TrendingDown` | lucide-react | Trend indicators |
| `Tooltip`, `Legend` | recharts | Chart interactivity |
| `Skeleton` | shadcn/ui | Loading state |

Chart color convention: Success = `emerald-500`, Failure = `rose-500`, Pending = `amber-400`, AI-involved = `violet-500`. Define as CSS custom properties on `:root` so dark mode works via Tailwind's `dark:` variant.

## 17.8 Shared / Layout Components

| Component | Source | Notes |
|---|---|---|
| `NavigationMenu` | shadcn/ui | Dashboard / Payments / Incidents / Analytics |
| `Avatar` + `DropdownMenu` | shadcn/ui | User avatar, org switcher, logout |
| `Breadcrumb` | shadcn/ui | Page hierarchy |
| `Toaster` | sonner | Success / error / info toasts |
| `Sheet` | shadcn/ui | Mobile navigation sidebar |
| `ScrollArea` | shadcn/ui | Scrollable panels |
| `Separator` | shadcn/ui | Section dividers |
| `ThemeToggle` | custom (1 component) | Light/dark via Tailwind `dark:` classes |
| `EmptyState` | custom (1 component) | Consistent empty state: icon + title + action |
| `ErrorBoundary` | custom (1 component) | Page-level React error boundary |
| `AiDisclaimer` | custom (1 component) | Standard disclaimer on all AI-generated panels |

---

# 18. Performance Targets

These are initial engineering targets — not achieved results. Validate against representative synthetic workloads.

Performance work begins in Phase 0. Establish baseline measurements before feature expansion and update them whenever a request path, cache policy, evidence assembler, or provider integration changes. Do not defer deterministic classification, bounded caching, evidence minimization, or single-flight deduplication until after the product is otherwise complete.

| Metric | Target | Measurement |
|---|---|---|
| Cached payment-status API | p95 ≤ 100 ms | Backend request latency |
| Indexed DB payment status lookup | p95 ≤ 200 ms | DB + endpoint timing |
| AI request deduplication | One execution per identical in-flight key | Concurrency tests |
| Repeated simple status queries | Zero LLM calls | AI invocation counter |
| Cache correctness | No stale result after committed update + successful invalidation | Invalidation integration tests |
| AI output validity | 100% schema-valid responses returned to clients | Zod validation tests |
| Unsupported evidence references | Zero accepted references | Adversarial AI tests |
| Cross-tenant data access | Zero successful unauthorized reads | Security integration tests |
| Cache memory | Within `CACHE_MAX_ENTRIES` bound | Load tests + memory metrics |
| AI token usage | Measured per investigation; minimize without reducing correctness | Provider usage metrics |
| AI failure handling | No indefinite waiting or uncontrolled retries | Fault-injection tests |

---

# 19. Testing Strategy

## 19.1 Unit Tests

Test: payment state rules, incident classification, evidence selection and redaction, cache key generation, evidence fingerprints, AI schema validation, evidence reference validation, authorization decisions, configuration validation, and retry/timeout policies.

## 19.2 Integration Tests

Test: PostgreSQL transactions and migrations, row-level security, connection pool tenant-context cleanup, webhook signature verification, payment state updates, outbox processing and invalidation, cache expiration and invalidation, and AI provider failures.

## 19.3 Security Tests

Test every scenario in Section 6.7. Priority: cross-tenant access, forged tenant context, cache collisions, model-invented evidence, and unauthorized recovery.

## 19.4 Adversarial AI Tests

Include: prompt injection in webhook payloads, instructions in logs or support messages, model-invented payment IDs, model-invented evidence references, claims inconsistent with authoritative data, malformed JSON output, excessive output, tool-call loops, requests for secrets, evidence from another tenant, and missing or conflicting evidence.

## 19.5 Performance and Reliability Tests

Test: concurrent identical requests, high cache-hit workloads, cache miss bursts, slow DB queries, Gemini latency, provider throttling, AI outage, memory growth under sustained load, event-loop delay, and invalidation events arriving out of order.

## 19.6 End-to-End Demo Tests

1. Investigate a payment inconsistency and display evidence-backed diagnosis.
2. Reject cross-merchant access with 404.
3. Repeated status questions using zero LLM calls (verified via invocation counter).
4. Trigger cache invalidation after a committed status change.
5. Invalid AI evidence reference rejected with 422.
6. AI outage — deterministic results returned, AI section shows `aiAvailable: false`.

## 19.7 Feature evidence contract

Every mandatory feature has a `FeatureEvidence` record containing:

| Field | Requirement |
|---|---|
| Feature identifier | Stable requirement, endpoint, rule, scenario, or workflow identifier |
| Implementation references | Source modules and integration path |
| Verification command | Exact command used |
| Test references | Exact test files and test names |
| Observed result | Pass/fail, count, latency, token usage, or other measured value |
| Security evidence | Authorization, tenant-isolation, and adversarial coverage |
| Limitations | Blocked checks, unverified external dependencies, or deferred scope |

Store the matrix in `docs/implementation/FEATURE_EVIDENCE.md` and update it in the same change as the implementation or test evidence it describes.

Allowed statuses are `NOT_STARTED`, `IN_PROGRESS`, `IMPLEMENTED_NOT_VERIFIED`, `BLOCKED`, `COMPLETE`, and `DEFERRED_BY_SPECIFICATION`. `COMPLETE` requires implementation, executed passing tests, and all required measurements. Generated code, compilation, a mock, a screenshot, or an unexecuted test is not evidence of completion.

The initial evidence matrix must explicitly cover payment confirmation (authoritative database response and zero AI invocations), tenant isolation, documented incident rules and scenarios, AI schema and evidence-reference validation, cache reuse and invalidation, clean migrations on an empty PostgreSQL database, frontend end-to-end workflows, and an unsuppressed production build.

---

# 20. CI/CD Quality Gates

Every gate must pass before merge to the main branch. No exceptions.

Each CI job must publish or retain the relevant `FeatureEvidence` results. A skipped, blocked, or credential-dependent check must be reported as such and cannot be converted to a passing status by suppressing errors or weakening assertions.

1. Formatting check (Prettier).
2. Linting (ESLint with `--max-warnings 0`).
3. Type checking (TypeScript `--noEmit`).
4. Unit tests with coverage threshold.
5. Integration tests (PostgreSQL in Docker, synthetic seed applied).
6. Database migration check (migrations apply cleanly to empty schema).
7. Tenant isolation tests.
8. AI output and evidence validation tests.
9. Build verification (production build succeeds).
10. Dependency vulnerability scan.
11. Secret scanning (no committed secrets or API keys).
12. Dependency cycle detection.
13. E2E and performance tests on the staging environment before release.

---

# 21. Phased Roadmap

## Phase 0 — Discovery
Define users, use cases, incident categories, authoritative data sources, business invariants, trust boundaries, and measurable success criteria.

## Phase 1 — Architecture
Choose module boundaries, define database schema and migrations, define API contracts, design tenant and authorization model, design cache keys and freshness policies, and record significant choices as ADRs.

## Phase 2 — Foundation
Create repository, configure TypeScript, ESLint, Prettier, lint-staged, and CI. Implement typed configuration with startup validation. Set up Docker Compose for local development. Add baseline tests and structured logging.

## Phase 3 — Secure Core
Implement authentication, session management, organization membership, and tenant-scoped data access with RLS. Create synthetic seed data. Add DB migrations and tests.

## Phase 4 — Deterministic Investigation Engine
Implement all 63 detection rules. Build payment status endpoint. Add query indexes. Verify that simple status queries make zero LLM calls. Validate rule coverage against all 62 scenarios.

## Phase 5 — AI Integration
Add `AiProvider` interface and `GeminiProvider` implementation. Implement evidence assembly and redaction. Add strict Zod output validation and evidence reference verification. Add token and latency metrics. Add timeouts, bounded retries, and provider failure handling. Add adversarial AI tests.

## Phase 6 — Cache and Performance
Add frontend TanStack Query caching with org-scoped keys. Add bounded backend LRU cache. Implement outbox-driven invalidation. Add evidence versioning and fingerprints. Add single-flight deduplication. Benchmark end-to-end latency and token usage.

## Phase 7 — UI/UX
Build all pages from Section 17 component inventory. Visually separate verified facts from AI explanations. Add loading, error, empty, and AI-degraded states. Ensure keyboard accessibility and responsive layout.

## Phase 8 — Hardening
Run security tests (Section 6.7), adversarial AI tests, load and soak tests, cache invalidation failure tests, AI outage behavior tests. Review logs for sensitive data leakage. Review configuration and dependency security.

## Phase 9 — Delivery
Deploy demo with synthetic data. Verify deployed build. Document architecture, threat model, API, schema, compliance assessment, test results, and measured performance. Prepare demo walkthrough.

---

# 22. Demo Script

The evaluator should complete this walkthrough in under 10 minutes.

**Step 1 — Login**
Open the app. Login as `analyst@fastmart.com`. Dashboard loads with incident summary: open CRITICAL count, HIGH count, volume chart.

**Step 2 — Payment status, zero AI calls**
Search for `PAY-10077` (SC-61: happy path). Status returns instantly: SUCCESS, order PAID, settlement SETTLED. Open browser DevTools Network tab — confirm no request to the AI provider endpoint. Search same payment again — response shows `cached: true`.

**Step 3 — Investigate a mismatch**
Search for `PAY-10001` (SC-01: provider SUCCESS, order PENDING, no ledger). Click **Investigate**. Result shows:
- Triggered rules: R001, R021.
- Verified facts panel: payment version 5, order version 3, webhook unprocessed.
- AI explanation panel (visually distinct): labeled "AI Analysis — not a verified fact".
- Evidence IDs cited by the model verified against investigation.
- Recommended next step.
- `aiUsed: true`, `modelVersion: gemini-1.5-flash-latest`, `promptVersion: v1.0`.

**Step 4 — Repeated investigation, result reused**
Click **Investigate** on `PAY-10001` again. Result returns instantly with `cached: true`. AI not called again.

**Step 5 — Full pipeline stall**
Navigate to Incidents → open incident for SC-38 (R039). Severity CRITICAL. AI synthesis explains: payment captured, order pending, webhook unprocessed, no ledger entry — all four downstream systems stalled.

**Step 6 — Recurring failure pattern**
Filter incidents by Rule ID `R052` (SC-50). Open incident. Pattern evidence: 5 failures in 45 min, dominant failure code, AI synthesis of common cause.

**Step 7 — Cross-tenant access rejected**
Request `GET /api/v1/payments/PAY-QUICKEATS-001`. Response: HTTP 404 — not visible in FastMart scope. Request `GET /api/v1/incidents/INC-QUICKEATS-01` — same result.

**Step 8 — Invalid AI evidence rejected**
Automated test: POST investigation with a tampered `evidenceId` in the model response. Server returns 422 — evidence ID does not belong to this investigation.

**Step 9 — AI outage resilience**
Set `AI_PROVIDER_API_KEY` to an invalid value and restart. Submit an investigation requiring AI synthesis. Deterministic findings are returned. AI section shows `aiAvailable: false`. Core payment status endpoint continues to work.

**Step 10 — Security anomaly**
Navigate to Incidents → filter Rule ID `R059` (SC-56). Open incident — CRITICAL severity, two payment IDs sharing the same idempotency key with different amounts shown as evidence.

---

# 23. Build Scope and Priority

## Must Build for Submission

| Priority | Item |
|---|---|
| P0 | Auth + session management + 1 tenant (FastMart) |
| P0 | All 63 incident rules in the deterministic engine |
| P0 | Payment status endpoint — zero AI, cached |
| P0 | Investigation pipeline with AI for Tier 3 rules |
| P0 | Zod validation on all AI output |
| P0 | Cross-tenant rejection (FastMart cannot see QuickEats data) |
| P0 | 62 seeded scenarios from Section 12 |
| P0 | Audit logging |
| P0 | AI outage graceful degradation |
| P1 | Outbox-driven cache invalidation |
| P1 | Single-flight deduplication |
| P1 | Payment timeline view |
| P1 | Incident list with severity filter |
| P1 | Analytics charts |
| P2 | QuickEats org (minimal data, for cross-tenant demo only) |

## Defer to Post-Challenge

- Redis (add only if multi-instance deployment is needed; not needed for demo).
- Recovery / refund workflow (spec is read-only; add only after read-only core is complete).
- Full RLS policies (query-level tenant scoping is sufficient for demo; add RLS as hardening).
- MFA.
- Email invite flow.
- Multiple AI provider adapters.

---

# 24. Architecture Decision Records

| ADR | Decision | Rationale |
|---|---|---|
| ADR-001 | Monorepo: `apps/web` + `apps/api` + `packages/` | Shared types; single CI pipeline; no cross-package API drift |
| ADR-002 | PostgreSQL only at launch; Redis deferred | Single-instance demo; add Redis only when multi-instance workload is measured |
| ADR-003 | Bounded LRU cache in-process | No external dependency at launch; Redis if multi-instance later |
| ADR-004 | Transactional outbox for cache invalidation | Prevents silent stale cache after webhook processing; survives process crashes |
| ADR-005 | Gemini 1.5 Flash via `AI_PROVIDER_MODEL` env var | Fastest structured-output model; model is configurable without code changes |
| ADR-006 | Zod everywhere (DB input, API input, AI output) | One validation library; consistent runtime type safety |
| ADR-007 | TanStack Query v5 for frontend server state | Best-in-class cache key control and org-scoped invalidation |
| ADR-008 | shadcn/ui as base component library | Unstyled Radix primitives + Tailwind; no lock-in; full TypeScript support |
| ADR-009 | Bearer token stored in PostgreSQL `sessions` table | Revocable on logout; no shared secret for JWT statelessness needed at this scale |
| ADR-010 | RLS as defense-in-depth after query-level scoping | Query-level `WHERE organization_id = :verified` is primary; RLS is a fallback |
| ADR-011 | `noUnusedLocals` and `noUnusedParameters` at compiler level | Enforce at build time; lint-staged pre-commit; CI gate; zero tolerance for dead code |
| ADR-012 | All config from env vars via Zod-validated `config` module | No hardcoded values in business logic; fail fast at startup on missing config |

---

# 25. Final Engineering Principles

1. **Zero LLM calls for deterministic payment confirmation.**
2. **Avoid repeated database work when a fresh, authorized result can safely be reused.**
3. **Use single-flight deduplication for identical concurrent investigations.**
4. **Use event-driven invalidation and evidence version checks for changing financial data.**
5. **Minimize evidence and bound output for every necessary AI call.**
6. **Never allow unbounded caches, queues, retry loops, or model invocations.**
7. **Never allow cross-tenant cache leakage or authorization bypass.**
8. **Never accept AI-generated financial facts without authoritative verification.**
9. **Measure latency, token usage, database load, memory, correctness, and failure behavior.**
10. **Add infrastructure only when evidence justifies it.**
11. **Keep PostgreSQL authoritative for payment and ledger data.**
12. **Keep the initial product read-only and recommendation-only.**
13. **Every unused variable, import, or parameter is a build error — not a warning.**
14. **Every configuration value lives in the typed `config` module — nowhere else.**
15. **The AI model is configurable at any time by changing one environment variable.**
16. **Names must describe the value they hold. Banned: `data`, `info`, `temp`, `x`, `val`.**
17. **Use synthetic data for the challenge demonstration.**
18. **Never claim regulatory compliance or certification without a formal assessment.**
19. **Maintain clear documentation, migrations, automated tests, and reproducible deployment.**
20. **Optimize for correctness and security first; then latency and cost without weakening either.**

**Core principle:** Use deterministic software to retrieve and verify financial facts. Use caching and deduplication to avoid repeated work. Use AI only when reasoning adds value that deterministic logic cannot provide. This is the foundation for a fast, cost-efficient, reliable, and secure Scrutio Investigator.
