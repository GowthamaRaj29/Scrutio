# SCRUTIO INVESTIGATOR
## Master System Design Generation Prompt

### 1. YOUR ROLE

Act as a Principal Software Architect, Senior Backend Engineer, Cloud Architect, Database Architect, AI Systems Engineer, Application Security Architect, and Site Reliability Engineer.

Your responsibility is to analyze the complete Scrutio Investigator requirements and produce a **comprehensive, technically accurate, implementation-ready system design**.

The design must be suitable for a real software engineering team to implement, test, deploy, maintain, and scale.

Do not start by writing application code. First understand the product, establish the requirements, investigate architectural options, validate technical decisions, and produce the complete system design.

### 2. AUTHORITATIVE SOURCE OF TRUTH

Locate and read the complete existing master specification:

`Scrutio_Investigator_Complete_Master_Specification.md`

Search the repository and relevant project documentation for the exact file if its location differs.

Before making architectural decisions:

1. Read the entire master specification.
2. Inspect all relevant existing documentation, requirements, diagrams, source code, configuration files, dependency manifests, and database schemas.
3. Identify the application's actual requirements and constraints.
4. Identify existing implementation decisions that must be preserved.
5. Identify missing requirements, ambiguities, contradictions, and technical risks.
6. Trace every significant architectural decision back to a requirement or explicitly documented assumption.

The master specification is the primary source of product requirements.

**Do not invent product features or silently replace specified requirements with your own assumptions.**

If a requirement is ambiguous, document the ambiguity, explain the available options, and identify the decision required. Make a provisional recommendation only when it is safe to do so, and label it clearly.

If a required source file cannot be found or read, report that limitation rather than pretending to have analyzed it.

### 3. NON-NEGOTIABLE CONSTRAINTS

#### 3.1 Zero-cost requirement

The developer is a student and cannot afford any development or deployment expenses.

The target budget is:

**₹0 per month, ₹0 in one-time payments, and ₹0 in mandatory purchases.**

The architecture must prioritize:

- Free development tools.
- Free source control.
- Free testing tools.
- Free CI/CD allowances.
- Free hosting where genuinely available.
- Free database options.
- Free storage options.
- Deterministic application logic instead of unnecessary paid AI inference.
- Local development and testing without paid external services.

AWS may be used only where the required services can be used within the verified account plan and its applicable free allowances.

Do not assume every AWS service is free. Investigate the current account plan, service availability, usage limits, billing conditions, regional restrictions, and resource-specific costs.

Do not depend on temporary promotional credits for permanent hosting.

Investigate alternative free deployment options where appropriate. Clearly distinguish permanent free allowances, limited free tiers, temporary offers, and local-only alternatives.

Do not select a service with mandatory charges or automatically activate paid services.

Before finalizing the architecture, create a provider comparison and explain why the selected architecture is the most appropriate zero-cost option.

#### 3.2 Official documentation-first engineering

Before selecting or recommending a technology, library, SDK, API, hosting provider, or database feature, consult its current official documentation.

Verify:

- Current supported version.
- Maintenance and support status.
- Deprecations and end-of-life notices.
- Installation and configuration requirements.
- Runtime and dependency compatibility.
- Security recommendations.
- Migration and breaking changes.
- Free-tier eligibility and limitations, where applicable.

Prioritize official documentation, official release notes, migration guides, security advisories, and official repositories.

Do not base architectural decisions solely on old tutorials, outdated code examples, or pretrained knowledge.

Record sources and verification dates in:

`docs/implementation/OFFICIAL_DOCUMENTATION_AUDIT.md`

Do not claim to have verified documentation if you could not access it.

#### 3.3 Correctness and security

The architecture must prioritize:

- Correct business logic.
- Reliable persistence.
- Authentication and authorization.
- Data isolation.
- Secure handling of secrets.
- Input validation.
- Auditability.
- Financial correctness wherever financial operations are applicable.
- Safe error handling.
- Idempotent operations where retries could cause duplicate effects.
- Protection against injection attacks and malicious input.
- Reliable migrations and recovery procedures.

Do not introduce unnecessary microservices, message brokers, orchestration systems, or paid infrastructure merely to make the design appear enterprise-grade.

Choose the simplest architecture that satisfies the actual requirements and allows future evolution.

### 4. PHASE 1 — REQUIREMENTS ANALYSIS

Create:

`docs/system-design/01_REQUIREMENTS_ANALYSIS.md`

Extract and organize the requirements into:

1. Product objectives.
2. User roles and permissions.
3. Core features.
4. User journeys.
5. Functional requirements.
6. Non-functional requirements.
7. Data requirements.
8. Integration requirements.
9. Security requirements.
10. AI-related requirements.
11. Performance requirements.
12. Deployment requirements.
13. Cost constraints.
14. Operational requirements.
15. Acceptance criteria.

Assign a unique identifier to each requirement.

Use identifiers such as:

- `FR-001` for functional requirements.
- `NFR-001` for non-functional requirements.
- `SEC-001` for security requirements.
- `AI-001` for AI requirements.
- `COST-001` for cost requirements.
- `OPS-001` for operational requirements.

Preserve the original meaning of the requirements.

Identify requirements that cannot yet be verified, measured, or implemented without further clarification.

Create a traceability matrix mapping every requirement to its proposed architectural component, implementation document, and validation method.

Output:

`docs/system-design/02_REQUIREMENTS_TRACEABILITY.md`

### 5. PHASE 2 — ARCHITECTURE OPTIONS AND DECISION

Create:

`docs/system-design/03_ARCHITECTURE_DECISIONS.md`

Evaluate the following architectural styles where applicable:

- Modular monolith.
- Service-oriented architecture.
- Microservices.
- Serverless architecture.
- Client-heavy architecture with a managed backend.

Do not select an architecture before evaluating the requirements and cost constraints.

Compare each relevant option based on:

- Implementation complexity.
- Operational burden.
- Security.
- Performance.
- Scalability.
- Data consistency.
- Testing.
- Deployment complexity.
- Free-tier feasibility.
- Vendor lock-in.
- Maintainability.

Recommend one architecture and explain the trade-offs.

For a student-developed project with a strict zero-cost requirement, consider a modular monolith as the initial architecture if it meets the requirements. Do not treat that recommendation as mandatory if the evidence supports a different choice.

Document important decisions as Architecture Decision Records.

Use:

`docs/system-design/adr/ADR-001-*.md`

Each ADR must contain:

- Context.
- Problem.
- Options considered.
- Decision.
- Rationale.
- Consequences.
- Security implications.
- Cost implications.
- Alternatives rejected.
- Conditions that would justify revisiting the decision.

### 6. PHASE 3 — HIGH-LEVEL SYSTEM ARCHITECTURE

Create:

`docs/system-design/04_HIGH_LEVEL_ARCHITECTURE.md`

Explain the complete system from the user's interaction to data storage and response delivery.

Include:

1. System boundaries.
2. External actors.
3. Frontend responsibilities.
4. Backend responsibilities.
5. Authentication boundaries.
6. Authorization boundaries.
7. Application modules.
8. Database responsibilities.
9. AI subsystem, if required.
10. Cache subsystem.
11. External integrations.
12. Background processing, if required.
13. Logging and monitoring.
14. Deployment boundaries.
15. Trust boundaries.
16. Failure boundaries.

Include Mermaid diagrams for:

- System context.
- Container-level architecture.
- Major application modules.
- Deployment topology.
- Data-flow overview.
- Trust boundaries.

The diagrams must represent the proposed implementation accurately.

Do not depict infrastructure, integrations, or services as deployed when they are merely proposed.

Distinguish between the initial zero-cost deployment and possible future production-scale architecture.

### 7. PHASE 4 — COMPONENT AND MODULE DESIGN

Create:

`docs/system-design/05_COMPONENT_DESIGN.md`

Define each major module and its responsibilities.

For every module, specify:

- Purpose.
- Owned business rules.
- Inputs.
- Outputs.
- Dependencies.
- Public interfaces.
- Data ownership.
- Authorization requirements.
- Failure behavior.
- Retry behavior.
- Logging requirements.
- Testing requirements.
- Associated requirement identifiers.

Keep business logic separate from framework-specific controllers, user-interface components, external APIs, and database access.

Use explicit module boundaries to prevent circular dependencies and uncontrolled coupling.

Do not create modules solely for theoretical future needs.

### 8. PHASE 5 — BACKEND AND API DESIGN

Create:

`docs/system-design/06_BACKEND_API_DESIGN.md`

Document the API architecture according to the actual requirements.

Specify:

- API conventions.
- Endpoint naming.
- HTTP methods.
- Request and response formats.
- Authentication requirements.
- Authorization requirements.
- Input validation.
- Pagination.
- Filtering and sorting.
- Error response format.
- Rate limiting.
- Idempotency.
- API versioning.
- Timeouts.
- Retry behavior.
- Request correlation IDs.
- Audit events.
- Sensitive-data handling.

Create an endpoint inventory containing:

| Field | Description |
|---|---|
| Endpoint ID | Unique identifier |
| Method | HTTP method |
| Path | API path |
| Purpose | Business capability |
| Authentication | Required or not |
| Authorization | Required role or permission |
| Input schema | Validation schema |
| Output schema | Response schema |
| Data access | Tables or modules accessed |
| Side effects | Database or external operations |
| Idempotency | Required behavior |
| Failure cases | Expected errors |
| Tests | Required validation |

Do not invent endpoints unrelated to the specification.

Where useful, produce an OpenAPI specification based on verified requirements.

### 9. PHASE 6 — DATABASE AND DATA ARCHITECTURE

Create:

`docs/system-design/07_DATABASE_DESIGN.md`

Design the data model based on actual requirements.

Include:

- Entity definitions.
- Relationships.
- Primary keys.
- Foreign keys.
- Unique constraints.
- Check constraints.
- Nullability.
- Indexes.
- Data ownership.
- Tenant boundaries, if applicable.
- Audit fields.
- Retention requirements.
- Migration strategy.
- Backup and restoration strategy.
- Data integrity rules.
- Transaction boundaries.

Produce Mermaid ER diagrams and a table-by-table schema specification.

For each table, document:

- Table name.
- Purpose.
- Columns.
- Data types.
- Constraints.
- Indexes.
- Relationships.
- Access patterns.
- Sensitive fields.
- Retention rules.

Evaluate PostgreSQL and any alternative justified by the requirements.

Verify the selected database's current free-tier limits, connection limits, storage limits, and deployment restrictions.

Avoid unnecessary database duplication.

#### Data integrity

Use database constraints and transactions to enforce important invariants.

Do not rely solely on frontend validation or AI-generated decisions for critical business rules.

Define concurrency behavior for operations that may be requested simultaneously.

Document migration rollback or recovery strategies.

### 10. PHASE 7 — SECURITY ARCHITECTURE

Create:

`docs/system-design/08_SECURITY_ARCHITECTURE.md`

Perform a structured threat analysis.

Include:

- Authentication.
- Authorization and RBAC.
- Session management.
- Password security, if passwords are used.
- Token lifecycle.
- Secret management.
- Database access controls.
- Tenant isolation, if applicable.
- Input validation.
- Injection prevention.
- CSRF and XSS protection where applicable.
- CORS configuration.
- SSRF protection where applicable.
- Rate limiting.
- Abuse prevention.
- File-upload security, if applicable.
- Logging and sensitive-data redaction.
- Dependency vulnerabilities.
- Supply-chain risks.
- Backup security.
- Incident response.
- Data deletion.
- Privacy and retention.
- Security testing.

Create a threat model with:

| Threat ID | Asset | Threat | Attack path | Impact | Mitigation | Verification |
|---|---|---|---|---|---|---|

Evaluate applicable OWASP guidance using current official documentation.

Do not weaken security to satisfy the zero-cost deployment requirement.

If a desired security feature depends on a paid service, identify a secure alternative and document the trade-off.

### 11. PHASE 8 — AI ARCHITECTURE AND COST OPTIMIZATION

Create:

`docs/system-design/09_AI_ARCHITECTURE.md`

First establish which requirements genuinely need AI.

Do not introduce AI merely because the product name or specification mentions intelligence.

Where AI is required, define:

- AI use cases.
- Inputs and outputs.
- Model selection criteria.
- Provider abstraction.
- Structured output schemas.
- Prompt versioning.
- Evidence requirements.
- Model failure behavior.
- Timeouts.
- Retry limits.
- Rate limits.
- Privacy boundaries.
- Prompt-injection defenses.
- Output validation.
- Evaluation methods.
- Cost controls.
- Latency measurement.
- Fallback behavior.

#### AI execution hierarchy

Use this priority order wherever appropriate:

1. Deterministic application logic.
2. Indexed database queries.
3. Validated cache.
4. Rule-based analysis.
5. Local inference where practical.
6. External AI inference only when genuinely needed and an approved zero-cost option is available.

Simple database questions must not trigger unnecessary LLM calls.

For example, if the application must answer whether a transaction has been confirmed, retrieve the authoritative transaction state and construct a deterministic response.

Do not ask an LLM to invent or determine authoritative transaction status.

#### Token and latency controls

Design for:

- Minimum unnecessary model calls.
- Bounded context.
- Compact prompts.
- Structured outputs.
- Request deduplication.
- Cache reuse.
- Cache invalidation.
- In-flight request coalescing.
- Explicit deadlines.
- Bounded retries.
- Model-independent business logic.
- Graceful operation without an AI provider.

Define measurable latency and AI-usage targets only where they are supported by the requirements or explicitly identified as proposed targets.

Do not promise zero tokens for an operation that genuinely requires an external model. Instead, eliminate unnecessary calls.

### 12. PHASE 9 — CACHE, MEMORY, AND PERFORMANCE

Create:

`docs/system-design/10_PERFORMANCE_AND_CACHING.md`

Analyze:

- Database query performance.
- Index selection.
- Connection pooling.
- Cache strategy.
- Memory limits.
- Request concurrency.
- Network overhead.
- Payload sizes.
- CPU usage.
- Background processing.
- Frontend bundle size.
- Rendering performance.
- Resource cleanup.

For each cache, define:

- What is cached.
- Cache key.
- Cache scope.
- TTL.
- Invalidation conditions.
- Maximum memory usage.
- Eviction policy.
- Staleness tolerance.
- Security implications.
- Behavior when the cache is unavailable.

Cache keys must include relevant tenant and authorization scope wherever needed.

Do not expose private information through shared caches.

Do not cache authoritative transaction status indefinitely.

Use bounded memory rather than unlimited in-memory storage.

Distinguish process-local caching from shared distributed caching.

Do not introduce Redis or another external cache unless the requirements justify it and the cost and hosting implications have been verified.

### 13. PHASE 10 — EXTERNAL INTEGRATIONS

Create:

`docs/system-design/11_INTEGRATION_DESIGN.md`

Inventory every external dependency required by the specification.

For each integration, document:

- Purpose.
- Official documentation.
- API or SDK version.
- Authentication.
- Required permissions.
- Rate limits.
- Free-tier status.
- Data shared.
- Timeout behavior.
- Retry strategy.
- Error handling.
- Idempotency.
- Security risks.
- Fallback.
- Test strategy.
- Replacement strategy.

Do not assume external APIs are free.

For development and testing, use mock implementations or sandbox environments where appropriate.

Mocks must never be mistaken for real production verification.

Do not expose secret keys in source code, browser bundles, logs, or repository history.

### 14. PHASE 11 — ZERO-COST DEPLOYMENT ARCHITECTURE

Create:

`docs/system-design/12_DEPLOYMENT_ARCHITECTURE.md`

Evaluate the smallest deployment that can satisfy the actual requirements.

Consider:

- Static frontend hosting.
- Free backend hosting.
- Free managed database hosting.
- Local deployment.
- Container-based development.
- CI/CD.
- HTTPS.
- Environment variables.
- Secrets.
- Database migrations.
- Backups.
- Logs.
- Health checks.
- Deployment rollback.
- Quota exhaustion.
- Service suspension.
- Provider lock-in.

For each proposed provider, verify the latest official documentation and current plan restrictions.

Create a provider comparison:

| Provider | Component | Free allowance | Permanent or temporary | Limitations | Payment requirements | Decision |
|---|---|---|---|---|---|---|

Do not mark a provider as free until its relevant conditions have been checked.

Design the system to operate within documented quotas.

If a free provider suspends inactive services or imposes cold starts, document the resulting latency and availability implications.

Do not use paid resources to avoid cold starts.

Include a deployment diagram and exact deployment sequence.

Document local development as a fallback when no suitable free public-hosting option exists.

### 15. PHASE 12 — TESTING ARCHITECTURE

Create:

`docs/system-design/13_TESTING_STRATEGY.md`

Define:

- Unit testing.
- Integration testing.
- API contract testing.
- Database testing.
- Authentication testing.
- Authorization testing.
- Tenant-isolation testing, if applicable.
- Security testing.
- Concurrency testing.
- Performance testing.
- AI evaluation, if applicable.
- Failure-recovery testing.
- End-to-end testing.
- Regression testing.
- Deployment smoke tests.

For each test category, define its objective, tools, execution environment, and acceptance criteria.

Prefer local execution and free CI allowances.

Test important failure cases, including:

- Invalid input.
- Expired sessions.
- Unauthorized access.
- Duplicate requests.
- Concurrent updates.
- Database unavailability.
- External API timeout.
- Rate-limit exhaustion.
- Cache invalidation.
- Missing configuration.
- AI provider unavailability.
- Insufficient memory.
- Failed database migration.
- Deployment failure.

Tests must validate actual behavior rather than simply checking that functions execute.

### 16. PHASE 13 — OBSERVABILITY AND OPERATIONS

Create:

`docs/system-design/14_OPERATIONS_AND_OBSERVABILITY.md`

Define a minimal operational strategy for:

- Structured logs.
- Request correlation.
- Error tracking.
- Health endpoints.
- Application metrics.
- Database monitoring.
- Latency monitoring.
- Resource consumption.
- Quota usage.
- Security events.
- Audit records.
- Data backups.
- Recovery procedures.

Use free tools and built-in capabilities where sufficient.

Avoid storing sensitive information in logs.

Do not introduce paid monitoring products without a verified zero-cost option.

Define the minimum information needed to diagnose errors without creating excessive storage or logging costs.

### 17. PHASE 14 — CAPACITY AND SCALABILITY

Create:

`docs/system-design/15_CAPACITY_AND_SCALABILITY.md`

Analyze expected workload based on documented requirements.

If traffic estimates are missing, do not invent them as facts.

Instead, define explicit low, medium, and high workload scenarios with labeled assumptions.

Estimate:

- Concurrent users.
- Request rate.
- Database query rate.
- Storage growth.
- Network traffic.
- Memory consumption.
- AI requests, if applicable.
- External API consumption.
- Background jobs.
- Bottlenecks.

Identify when the initial architecture may need to change.

Distinguish:

1. What can run in the zero-cost deployment.
2. What can be load-tested locally.
3. What would require more resources for a larger production workload.
4. Which scaling options would violate the zero-cost requirement.

Never claim that a free deployment can support millions of users without workload-specific evidence.

### 18. PHASE 15 — IMPLEMENTATION ROADMAP

Create:

`docs/system-design/16_IMPLEMENTATION_ROADMAP.md`

Break implementation into dependency-aware phases.

For each phase, specify:

- Objective.
- Requirements covered.
- Modules affected.
- Database changes.
- API changes.
- Security implications.
- Official documentation to consult.
- Tests required.
- Dependencies.
- Risks.
- Acceptance criteria.
- Completion evidence.

Organize work so that security foundations, data integrity, and core business logic are implemented before optional intelligence and optimization.

Avoid implementing speculative infrastructure before it is needed.

Include explicit decision gates for unresolved architectural questions.

### 19. PHASE 16 — RISKS AND OPEN DECISIONS

Create:

`docs/system-design/17_RISKS_AND_OPEN_DECISIONS.md`

List:

- Requirement ambiguities.
- Technical uncertainties.
- Dependency risks.
- Security risks.
- Free-tier limitations.
- Provider lock-in.
- Performance risks.
- Data migration risks.
- Operational risks.
- Unsupported assumptions.

For each item, record:

- ID.
- Description.
- Severity.
- Likelihood.
- Impact.
- Mitigation.
- Owner or responsible module.
- Decision required.
- Verification method.
- Status.

Do not silently resolve important product decisions without recording the rationale.

### 20. PHASE 17 — FINAL ARCHITECTURE REVIEW

Create:

`docs/system-design/18_SYSTEM_DESIGN_REVIEW.md`

Perform a systematic review of the complete design.

Verify:

1. Every known requirement is traceable to a component and validation method.
2. No required feature has been omitted from the proposed architecture.
3. No undocumented product behavior has been invented.
4. Module boundaries are clear.
5. Database relationships and constraints are coherent.
6. API contracts agree with the data model.
7. Security controls cover the identified threats.
8. AI is not used where deterministic logic is sufficient.
9. Cache invalidation and authorization are correct.
10. External integrations have explicit failure behavior.
11. Every required dependency has been checked against official documentation.
12. Every proposed deployment provider has been assessed for cost.
13. No mandatory paid resource remains hidden.
14. Testing covers critical business and security behavior.
15. Operational procedures are documented.
16. Capacity claims are supported by evidence or labeled assumptions.
17. Implementation phases are ordered according to dependencies.

Record all findings and unresolved issues.

Do not mark the design as fully validated while critical requirements or cost questions remain unresolved.

### 21. REQUIRED OUTPUT STRUCTURE

Produce the following files:

```text
docs/
└── system-design/
    ├── 01_REQUIREMENTS_ANALYSIS.md
    ├── 02_REQUIREMENTS_TRACEABILITY.md
    ├── 03_ARCHITECTURE_DECISIONS.md
    ├── 04_HIGH_LEVEL_ARCHITECTURE.md
    ├── 05_COMPONENT_DESIGN.md
    ├── 06_BACKEND_API_DESIGN.md
    ├── 07_DATABASE_DESIGN.md
    ├── 08_SECURITY_ARCHITECTURE.md
    ├── 09_AI_ARCHITECTURE.md
    ├── 10_PERFORMANCE_AND_CACHING.md
    ├── 11_INTEGRATION_DESIGN.md
    ├── 12_DEPLOYMENT_ARCHITECTURE.md
    ├── 13_TESTING_STRATEGY.md
    ├── 14_OPERATIONS_AND_OBSERVABILITY.md
    ├── 15_CAPACITY_AND_SCALABILITY.md
    ├── 16_IMPLEMENTATION_ROADMAP.md
    ├── 17_RISKS_AND_OPEN_DECISIONS.md
    ├── 18_SYSTEM_DESIGN_REVIEW.md
    └── adr/
        ├── ADR-001-*.md
        └── ...
```

Also update or create:

```text
docs/implementation/
├── OFFICIAL_DOCUMENTATION_AUDIT.md
└── FREE_TIER_SERVICE_AUDIT.md
```

Create supporting Mermaid diagrams or OpenAPI documents in appropriate subdirectories when they materially improve the design.

Do not create empty documents merely to satisfy the file list.

### 22. WORKING RULES

- Inspect the existing repository before modifying files.
- Preserve existing user work.
- Do not delete or overwrite existing documentation without reviewing it.
- Do not implement the application during this system-design task.
- Do not install unnecessary packages merely to produce architecture documents.
- Do not assume that the latest version of every library is automatically compatible with the project.
- Do not claim that a design has been tested when only a static review was performed.
- Do not claim that a provider's free tier has been verified without checking its current official terms.
- Label assumptions, verified facts, recommendations, and unresolved questions separately.
- Use Mermaid syntax for diagrams where appropriate.
- Ensure all diagrams agree with the written architecture.
- Use consistent terminology throughout all documents.
- Keep the documents detailed enough that another engineer or coding agent can implement the design without repeatedly guessing at missing decisions.

### 23. COMPLETION REPORT

After generating the design documents, provide a concise report containing:

1. Files created or updated.
2. Architectural style selected and why.
3. Proposed technology stack.
4. Proposed zero-cost deployment architecture.
5. Key security decisions.
6. AI and latency optimization strategy.
7. Highest-risk technical decisions.
8. Unresolved questions requiring my input.
9. Requirements that could not be fully addressed.
10. The recommended next step before implementation.

**Final instruction:** Generate the complete system design from the actual Scrutio Investigator specification, validate technical decisions against current official documentation, and optimize for correctness, security, maintainability, low latency, minimal unnecessary AI usage, and a verified ₹0 deployment path. Do not begin application implementation until the system design has been reviewed.