# Detection-rule coverage audit

Audit date: 2026-10-28

Source of truth: `Prompts/Scrutio_Investigator_Complete_Master_Specification.md`,
the actual `InvestigationEngine`, normalized evidence schema, PostgreSQL source query,
migrations, and executed tests. Documentation claims were not treated as implementation
evidence.

## Classification

- **IMPLEMENTED_VERIFIED**: the rule ID and semantics are present in the engine, required
  evidence is loaded, and a direct test verifies the behavior.
- **IMPLEMENTED_UNDERTESTED**: the rule ID and condition are present and evidence is available,
  but direct positive/boundary coverage is incomplete.
- **PARTIAL_OR_MISIDENTIFIED**: code exists for related behavior, but the rule ID, condition,
  evidence, or severity does not match the specification exactly.
- **BLOCKED_QUERY_OR_EVIDENCE**: the required facts exist in PostgreSQL or established
  operational data, but the investigation evidence/query does not expose enough information
  to evaluate the rule.
- **NOT_STARTED_SCHEMA_OR_EXTERNAL**: required fields, aggregates, audit history, incident
  state, or external allowlists are not represented by the current authoritative model.

## Rule-by-rule audit

| Rule | Spec condition summary                                  | Status                         | Evidence from implementation                                                                                                          |
| ---- | ------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| R001 | Successful payment with pending order                   | IMPLEMENTED_VERIFIED           | Engine condition, order source loading, and direct finding test                                                                       |
| R002 | Successful payment with failed order                    | IMPLEMENTED_VERIFIED           | Direct unit and tenant-scoped PostgreSQL positive, negative, and missing-order evidence tests pass                                    |
| R003 | Successful payment with cancelled order                 | IMPLEMENTED_VERIFIED           | Direct unit and tenant-scoped PostgreSQL positive, negative, and missing-order evidence tests pass                                    |
| R004 | Failed/cancelled payment with paid order                | IMPLEMENTED_VERIFIED           | Direct failed and cancelled payment tests verify the CRITICAL finding and distinct R041 behavior                                      |
| R005 | Pending payment past threshold                          | IMPLEMENTED_VERIFIED           | Engine threshold test covers inclusive boundary and below-threshold behavior                                                          |
| R006 | Payment exceeds order by more than 0.01                 | IMPLEMENTED_VERIFIED           | Exact cents unit and tenant-scoped PostgreSQL tests verify INR 0.01 is no match and INR 0.02 is a match                               |
| R007 | Successful payment is below order by more than 0.01     | IMPLEMENTED_VERIFIED           | Exact cents, SUCCESS-state, and tenant-scoped PostgreSQL tests verify tolerance and eligibility                                       |
| R008 | Payment/order currency mismatch                         | IMPLEMENTED_VERIFIED           | Direct unit and tenant-scoped PostgreSQL positive, negative, and missing-order tests pass                                             |
| R009 | Over-collection across successful payments for an order | IMPLEMENTED_VERIFIED           | Tenant-scoped order aggregate returns successful sum/count; exact 1% boundary and live query coverage are tested                      |
| R010 | Multiple successful payments for one order              | IMPLEMENTED_VERIFIED           | Tenant-scoped successful-payment count aggregate and live duplicate-order coverage are tested                                         |
| R011 | Verified webhook not processed past threshold           | IMPLEMENTED_VERIFIED           | Direct unit and tenant-scoped PostgreSQL delayed-webhook and processed-webhook tests pass                                             |
| R012 | Unverified webhook was processed                        | IMPLEMENTED_VERIFIED           | Engine condition and direct mismatch test                                                                                             |
| R013 | Duplicate processed provider event ID                   | NOT_STARTED_SCHEMA_OR_EXTERNAL | Webhook schema stores `event_id`, not the specification's `provider_event_id`; no aggregate evaluation                                |
| R014 | Payment webhook has no matching payment                 | BLOCKED_QUERY_OR_EVIDENCE      | Nullable webhook payment relationship exists, but event type is not normalized/loaded                                                 |
| R015 | Capture webhook contradicts failed payment              | BLOCKED_QUERY_OR_EVIDENCE      | Payment and webhook status exist, but normalized evidence omits `event_type`                                                          |
| R016 | Webhook retries exceed maximum                          | BLOCKED_QUERY_OR_EVIDENCE      | `retry_count` and `max_retries` exist in PostgreSQL, but are not loaded into evidence                                                 |
| R017 | Received webhook delayed more than two hours            | BLOCKED_QUERY_OR_EVIDENCE      | Received timestamp/status exist, but no rule or direct source evaluation exists                                                       |
| R018 | Fresh capture webhook with stale payment status         | BLOCKED_QUERY_OR_EVIDENCE      | Payment and webhook timestamps/status exist, but `event_type` is not loaded                                                           |
| R019 | Failure webhook contradicts successful payment          | BLOCKED_QUERY_OR_EVIDENCE      | Payment and webhook status exist, but normalized evidence omits `event_type`                                                          |
| R020 | Webhook received after settled settlement               | IMPLEMENTED_VERIFIED           | Direct late, early, and missing settlement-timestamp tests verify the INFO finding and insufficient-evidence behavior                 |
| R021 | Successful payment has no ledger entry                  | IMPLEMENTED_VERIFIED           | Engine now uses the specification ID and the existing SC-01 test verifies the finding                                                 |
| R022 | Posted ledger for failed/cancelled/expired payment      | IMPLEMENTED_VERIFIED           | Existing latest-ledger evidence, direct rule tests, and live PostgreSQL query coverage verify tenant-safe evaluation                  |
| R023 | Payment-credit ledger amount mismatch                   | IMPLEMENTED_VERIFIED           | Tenant-scoped exact payment-credit amount mismatch aggregate and direct/live tests verify entry-type filtering                        |
| R024 | Duplicate posted payment-credit ledger entries          | IMPLEMENTED_VERIFIED           | Tenant-scoped `POSTED`/`PAYMENT_CREDIT` count aggregate and live duplicate-ledger coverage are tested                                 |
| R025 | Ledger pending beyond one hour                          | IMPLEMENTED_VERIFIED           | Tenant-scoped latest-ledger created-at evidence uses evaluation-time age and strict one-hour boundary tests                           |
| R026 | Journal debit/credit imbalance                          | IMPLEMENTED_VERIFIED           | Tenant-scoped journal debit/credit aggregates preserve missing-versus-balanced semantics and use exact decimal comparison             |
| R027 | Unexpected ledger account code                          | BLOCKED_QUERY_OR_EVIDENCE      | Ledger accounts exist, but account code/allowlist is not in evidence                                                                  |
| R028 | Reversed ledger without payment reversal reason         | NOT_STARTED_SCHEMA_OR_EXTERNAL | Reversal reason and corresponding payment reversal history are absent                                                                 |
| R029 | Refund debit without refund payment status              | IMPLEMENTED_VERIFIED           | Tenant-scoped refund-debit existence projection detects non-refund payment statuses, including non-latest entries                     |
| R030 | Missing fee debit above threshold                       | BLOCKED_QUERY_OR_EVIDENCE      | Ledger rows exist, but entry-type aggregate and fee threshold evidence are absent                                                     |
| R031 | Successful payment missing settlement past threshold    | BLOCKED_QUERY_OR_EVIDENCE      | Payment/settlement presence is loaded, but settlement threshold configuration/timing is absent                                        |
| R032 | Settlement net amount reconciliation mismatch           | NOT_STARTED_SCHEMA_OR_EXTERNAL | Current settlement model lacks net amount, fees, and allocation amounts                                                               |
| R033 | Settled settlement includes pending payment             | IMPLEMENTED_VERIFIED           | Direct unit and tenant-scoped PostgreSQL positive and non-pending settlement tests pass                                               |
| R034 | Past-due pending settlement                             | BLOCKED_QUERY_OR_EVIDENCE      | Settlement date exists in PostgreSQL but is not normalized into evidence                                                              |
| R035 | Failed payment included in settlement                   | IMPLEMENTED_VERIFIED           | Tenant-safe settlement-link evidence, direct rule test, and live PostgreSQL evidence test verify the condition                        |
| R036 | Settlement/payment currency mismatch                    | IMPLEMENTED_VERIFIED           | Direct unit and tenant-scoped PostgreSQL mismatch and matching-currency tests pass                                                    |
| R037 | Payment appears in multiple settlements                 | IMPLEMENTED_VERIFIED           | Tenant-scoped distinct settlement-link count aggregate and live multi-settlement coverage are tested                                  |
| R038 | Settled settlement has no UTR                           | BLOCKED_QUERY_OR_EVIDENCE      | UTR exists in the settlement table but is not loaded into evidence                                                                    |
| R039 | Full pipeline stall                                     | IMPLEMENTED_VERIFIED           | Engine requires successful payment, pending order, unprocessed webhook, and no ledger; direct processed-webhook negative test exists  |
| R040 | Paid/order-complete payment missing settlement          | BLOCKED_QUERY_OR_EVIDENCE      | Required payment/order/webhook/settlement facts are available, but no rule/threshold evaluation exists                                |
| R041 | Failed payment with paid order                          | IMPLEMENTED_VERIFIED           | Separate CRITICAL R041 evaluation and regression test preserve the distinct cross-domain rule; AI synthesis remains unavailable       |
| R042 | Processed webhook and ledger with pending order         | IMPLEMENTED_VERIFIED           | Direct unit and tenant-scoped PostgreSQL positive, paid-order negative, and missing-evidence tests pass                               |
| R043 | Refund debit for failed/cancelled payment               | IMPLEMENTED_VERIFIED           | Shared refund-debit existence evidence and independent FAILED/CANCELLED evaluation are covered by unit/live tests                     |
| R044 | Completed pre-settlement pipeline with no settlement    | IMPLEMENTED_VERIFIED           | Direct unit and tenant-scoped PostgreSQL positive, settled negative, and missing-order/ledger tests pass                              |
| R045 | Disputed payment without open incident                  | NOT_STARTED_SCHEMA_OR_EXTERNAL | No open-incident evidence/query is implemented                                                                                        |
| R046 | Cancelled payment with unreversed posted ledger         | NOT_STARTED_SCHEMA_OR_EXTERNAL | Reversal-entry history is not represented in normalized evidence                                                                      |
| R047 | Initiated payment has no subsequent status event        | NOT_STARTED_SCHEMA_OR_EXTERNAL | Payment status history/event stream is absent                                                                                         |
| R048 | Capture latency exceeds 24 hours                        | NOT_STARTED_SCHEMA_OR_EXTERNAL | Initiated/captured timestamps are absent from the current payment model                                                               |
| R049 | Webhook processed before received                       | BLOCKED_QUERY_OR_EVIDENCE      | `processed_at` exists in PostgreSQL but is omitted from normalized webhook evidence                                                   |
| R050 | Ledger posted before payment capture                    | NOT_STARTED_SCHEMA_OR_EXTERNAL | Payment capture timestamp and ledger posted timestamp are not both available                                                          |
| R051 | Settlement settled before payment capture               | NOT_STARTED_SCHEMA_OR_EXTERNAL | Payment capture and settlement settled timestamps are not both normalized                                                             |
| R052 | Burst of failed payments                                | IMPLEMENTED_VERIFIED           | Tenant-scoped distinct failed-payment aggregate over provider observed events; strict configured threshold and live PostgreSQL test   |
| R053 | Repeated failure by payment method                      | NOT_STARTED_SCHEMA_OR_EXTERNAL | `payment_method` is absent from the current payment model                                                                             |
| R054 | Repeated failure by failure code                        | NOT_STARTED_SCHEMA_OR_EXTERNAL | `failure_code` is absent from the current payment model                                                                               |
| R055 | Webhook failure storm                                   | IMPLEMENTED_VERIFIED           | Tenant-scoped distinct FAILED webhook-event aggregate; strict configured threshold and live PostgreSQL test                           |
| R056 | Failure rate above threshold                            | IMPLEMENTED_VERIFIED           | Tenant-scoped distinct FAILED/(FAILED+SUCCESS) provider-event payment aggregate; strict percentage test and zero-observation handling |
| R057 | Average capture latency pattern                         | NOT_STARTED_SCHEMA_OR_EXTERNAL | Initiated/captured timestamps are absent                                                                                              |
| R058 | Repeated failures by customer                           | NOT_STARTED_SCHEMA_OR_EXTERNAL | `customer_id` is absent from the current payment model                                                                                |
| R059 | Idempotency key reused with different amounts           | NOT_STARTED_SCHEMA_OR_EXTERNAL | `idempotency_key` is absent from the current payment model                                                                            |
| R060 | Duplicate provider reference across payments            | IMPLEMENTED_VERIFIED           | Authoritative payment columns, tenant-scoped query, deterministic CRITICAL finding, unit and live integration tests                   |
| R061 | Webhook source IP outside provider allowlist            | NOT_STARTED_SCHEMA_OR_EXTERNAL | Source IP and provider allowlist are absent                                                                                           |
| R062 | Payment amount changed between initiation and capture   | NOT_STARTED_SCHEMA_OR_EXTERNAL | No payment audit trail or capture snapshot exists                                                                                     |
| R063 | Refunded amount exceeds captured amount                 | NOT_STARTED_SCHEMA_OR_EXTERNAL | Captured/refunded amount fields are absent                                                                                            |

## Coverage summary

- **Implemented and directly verified:** 33 rules — R001, R002, R003, R004, R005, R006, R007, R008, R009, R010, R011, R012, R020, R021, R022, R023, R024, R025, R026, R029, R033, R035, R036, R037, R039, R041, R042, R043, R044, R052, R055, R056, and R060.
- **Implemented but under-tested:** 0 rules in this boundary-test group; live PostgreSQL validation for these direct evaluator cases remains a separate follow-up.
- **Partial or misidentified:** none among R004, R020, R021, R039, and R041 after this correction.
- **Blocked primarily by missing evidence queries/normalization:** 13 rules — R014-R019, R027, R030-R031, R034, R038, R040, and R049.
- **Not started because required schema, audit, incident, or external data is absent:** 17 rules — R013, R028, R032, R045-R048, R050-R051, R053-R054, R057-R059, and R061-R063.

The counts intentionally distinguish a rule whose data exists but is not queried from a rule that
cannot be implemented without changing the authoritative model. They do not imply full rule
coverage, AI coverage, or production readiness.

## R027/R030/R031 evidence and lifecycle audit

The 2026-11-01 audit deliberately added no evidence projection, configuration default, or
migration:

- **R027:** `ledger_accounts.account_code` is tenant-scoped and linked to ledger entries, but no
  organization-owned allowed-account-code policy exists in the schema, configuration, ingestion
  contract, or normalized evidence.
- **R030:** `ledger_entries.entry_type` is ingestion-controlled and not constrained to a documented
  fee vocabulary. There is no authoritative `feeThreshold` source, nor a policy defining the
  threshold amount basis or currency semantics.
- **R031:** `payments` has no capture or success-transition timestamp. `updated_at` is mutation time
  and is not an authoritative lifecycle event. No authoritative `settlementMissingThreshold`
  source exists.

Implementation requires ownership decisions for the tenant allowlist, fee vocabulary and threshold,
and payment capture-transition timestamp and settlement threshold. No safe rule predicate can be
implemented before those decisions.

## Priority order

1. Add direct boundary tests for the already-coded POM and webhook rules, including the
   specification's `0.01` tolerance for R006/R007.
2. Add direct boundary tests for the remaining implemented-under-tested rules.
3. Defer schema-dependent families such as customer, idempotency, capture-history, fee,
   refund, source-IP, and settlement reconciliation rules until their authoritative semantics
   are specified and represented.
