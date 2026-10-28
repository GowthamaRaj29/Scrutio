# MANDATORY ZERO-COST DEVELOPMENT AND DEPLOYMENT POLICY

## 1. Non-Negotiable Budget Constraint

The developer is a student and has **₹0 available for development, hosting, APIs, databases, AI inference, storage, monitoring, networking, and deployment**.

Build, test, and deploy Scrutio Investigator using services and tools that can be used at **zero out-of-pocket cost**.

These requirements are mandatory:

- Never recommend a paid service when a viable free alternative exists.
- Never activate a paid plan, purchase credits, start a paid trial, or create a billable resource.
- Never assume that a service is free simply because it advertises a free tier.
- Never assume promotional credits constitute a sustainable free deployment.
- Never upgrade an account to a paid plan to unlock a feature.
- Never require a paid API key for the application's core functionality.
- Never use a service that requires payment after a trial expires unless the architecture can switch to a genuinely free alternative before that happens.
- Never make a purchase, upgrade an account, or enable a billable service on the developer's behalf.
- If a requirement cannot be implemented within the zero-cost constraint, document the limitation and provide a genuinely free alternative.
- Do not compromise authentication, authorization, data isolation, financial correctness, or other security controls to reduce costs.

**Budget target: ₹0 per month, ₹0 in one-time payments, and ₹0 in mandatory purchases.**

## 2. AWS Free-Tier Rules

AWS may be used where appropriate, but only after verifying the exact service, account plan, regional availability, usage limits, and billing implications against the current official documentation.

Official references:
- AWS Free Tier: https://aws.amazon.com/free/
- AWS Free Tier FAQs: https://aws.amazon.com/free/free-tier-faqs/
- AWS Free Tier documentation: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier.html
- AWS guidance for avoiding unexpected charges: https://docs.aws.amazon.com/en_en/awsaccountbilling/latest/aboutv2/avoid-charges-after-free-tier.html

### Required safeguards

1. Determine whether the account is eligible for the AWS Free account plan.
2. Check the current account plan before selecting any AWS service.
3. Prefer services and features explicitly available without charges under the selected account plan.
4. Verify that every proposed service is available in the intended AWS Region.
5. Verify limits for compute, storage, requests, bandwidth, logging, database operations, backups, and data transfer.
6. Do not rely on expiring credits as the basis for permanent free hosting.
7. Do not activate services that require a paid account plan.
8. Do not deploy EC2 instances, NAT gateways, load balancers, managed databases, or other potentially billable resources without verifying their complete cost implications and eligibility.
9. Do not assume stopping a resource eliminates all charges. Check for persistent storage, public IPv4 addresses, snapshots, and other associated resources.
10. If a service is not essential, prefer a simpler architecture that avoids it.

### AWS account plan

AWS currently documents a Free account plan for eligible new customers, with no charges during the plan period. Its documented duration is up to six months or until the applicable credits are exhausted, whichever occurs first. Eligibility and terms must be verified at implementation time.

For this project, **do not treat temporary AWS credits as a guarantee of permanent free hosting**. If the application needs to remain deployed after temporary eligibility ends, use a deployment architecture that remains free without requiring a paid AWS account.

## 3. Research Every Service Before Adoption

Before choosing AWS or any other provider, investigate its current official documentation.

For each candidate service, record:

- Official service name and documentation URL.
- Whether a free account is required.
- Whether a payment method is required.
- Whether identity or card verification is required.
- Free monthly quotas and usage limits.
- Whether the free offer is permanent, time-limited, or credit-based.
- What happens when quotas are exceeded.
- Whether automatic overage billing is possible.
- Whether the service can be used without upgrading.
- Whether the required region and features are supported.
- Data retention and account suspension policies.
- Whether the service can be replaced without a major application rewrite.

Do not invent free allowances or infer pricing from old tutorials.

Update `docs/implementation/FREE_TIER_SERVICE_AUDIT.md` before integrating a new hosting, database, AI, storage, or external API provider.

## 4. Prefer a Free-First Architecture

Choose the simplest architecture that satisfies the master specification without requiring paid infrastructure.

Evaluate these options individually; do not assume they are all free or suitable without checking their current terms.

| Requirement | First approach to evaluate |
|---|---|
| Frontend hosting | GitHub Pages or another verified free static host |
| Backend hosting | A verified free application-hosting service, or a self-hosted deployment on infrastructure that genuinely costs nothing |
| Database | A verified free managed PostgreSQL service, or local PostgreSQL for development |
| Authentication | Application-managed authentication using secure, established libraries |
| AI functionality | Deterministic processing first; free local models or a verified free API allowance only when necessary |
| File storage | Local development storage or a verified free object-storage allowance |
| CI/CD | GitHub Actions or another verified free CI/CD allowance |
| Source control | Git and a free private or public repository, as appropriate |
| Monitoring | Structured application logs and free monitoring options with verified limits |
| Testing | Local automated tests and free CI execution allowances |
| Secrets | Environment variables and deployment-provider secret storage where available at no cost |

This table is a research checklist, not a guarantee that each service is free under every account, repository, workload, or deployment scenario.

## 5. Never Require Paid AI Inference

The application must remain useful without paid AI APIs.

Implement the following order of operations:

1. **Deterministic logic:** Answer simple status, validation, calculation, filtering, and lookup questions using application code and indexed database queries.
2. **Cached results:** Reuse valid, authorized results when the underlying data has not changed.
3. **Local intelligence:** Evaluate rule-based investigation logic and local models when the machine has sufficient resources.
4. **Optional free AI:** Use an external AI API only after verifying its current free allowance, rate limits, data policies, and billing behavior.

Do not send every user question to an LLM.

For example, a payment-confirmation question should use the authoritative database and deterministic response templates. It must not require an LLM call.

If a free AI allowance is unavailable or exhausted, disable the optional AI feature gracefully. The rest of the application must continue to work.

Never claim that an external AI API is permanently free merely because it currently provides a free allowance.

## 6. No Hidden Costs

Audit the complete cost of operating the system, not just the headline hosting price.

Check for:

- Domain registration and renewal.
- Custom-domain requirements.
- Database storage and compute.
- Database connection limits.
- Object storage and downloads.
- Bandwidth and outbound data transfer.
- Public IP addresses.
- NAT gateways and load balancers.
- Logs, metrics, traces, and retention.
- Backups and snapshots.
- Build minutes and CI/CD usage.
- Scheduled jobs and background workers.
- Email, SMS, OTP, and push-notification providers.
- Maps, geocoding, payment, identity verification, and other external APIs.
- AI token usage and model hosting.
- Database migration and backup tools.
- Security scanning and monitoring limits.
- Payment verification and production account requirements.

A free application host does not make a paid external API free.

Do not require paid SMS, maps, email, identity-verification, or payment services for local development and automated tests. Provide mock adapters and sandbox modes where appropriate, clearly separating test behavior from real production operations.

Never represent simulated payment verification, simulated notifications, or mocked identity verification as a completed real-world integration.

## 7. Mandatory Billing Protection

Before deploying any AWS resources:

1. Inspect the account plan and current free-tier eligibility.
2. Verify whether the proposed services are available under that plan.
3. Review the service-specific pricing and billing documentation.
4. Avoid paid-only services and any resource with unverified cost implications.
5. Review the account's billing and usage information.
6. Document how the developer can identify and remove unnecessary resources.
7. Document the limitations of any available billing alerts or budget controls.

**Important:** Billing alerts and budgets are monitoring mechanisms, not a guarantee that charges cannot occur. Do not rely on them as the sole protection against unexpected costs.

If a deployment provider requires a paid plan, mandatory purchase, or unavoidable payment commitment, reject that deployment option.

## 8. Graceful Degradation and Provider Independence

Design integrations behind clear interfaces so providers can be replaced without rewriting core business logic.

Examples:

- `AIProvider`
- `DatabaseProvider`
- `ObjectStorageProvider`
- `NotificationProvider`
- `EmailProvider`
- `PaymentVerificationProvider`

Implement local development and test adapters where practical.

When an external service reaches a quota, becomes unavailable, or ceases to offer a free allowance:

- Do not silently switch to a paid service.
- Do not automatically upgrade the account.
- Do not retry indefinitely.
- Do not lose critical application data.
- Return a clear error or use a safe fallback.
- Preserve security and auditability.
- Explain which optional features are temporarily unavailable.

## 9. Deployment Readiness Gate

Before declaring deployment complete, produce `docs/implementation/FREE_DEPLOYMENT_REPORT.md` containing:

1. Final architecture and provider list.
2. Official documentation links for the selected services.
3. Verified free-plan or free-tier terms.
4. Required account setup and verification.
5. Any payment-method requirement.
6. Monthly limits and relevant quotas.
7. Persistent free versus temporary free classifications.
8. Known billing risks and how they were addressed.
9. Deployment instructions.
10. Environment-variable and secret setup.
11. Database migration and backup instructions.
12. Steps to remove deployed resources and stored data.
13. Features that require external services.
14. Features that degrade gracefully when quotas are reached.
15. Remaining limitations or unresolved cost risks.

Do not describe the deployment as guaranteed to cost ₹0 if a required provider, usage limit, or billing condition remains unverified.

## 10. Final Acceptance Criteria

The project is acceptable only when:

- The application can be developed and tested locally without paid services.
- The selected deployment path has been verified against current official documentation.
- No mandatory paid API, subscription, domain, or infrastructure purchase is required.
- The application does not automatically activate paid services or upgrade accounts.
- Optional AI functionality can be disabled without breaking core workflows.
- Core status checks and business rules work without paid AI inference.
- All external services have documented quotas and fallback behavior.
- The deployment report clearly distinguishes permanent free allowances from temporary offers.
- No unresolved, mandatory cost has been hidden or assumed away.
- Security and correctness requirements remain intact.

If no provider can satisfy a particular deployment requirement at zero cost, **report the limitation honestly and offer a genuinely free alternative**, even if that means using a local deployment or accepting reduced availability.

The student's zero-cost requirement takes precedence over unnecessary architectural complexity, but never over security, correctness, or honest reporting.