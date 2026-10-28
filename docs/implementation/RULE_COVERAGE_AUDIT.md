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

| Rule | Spec condition summary                                  | Status                         | Evidence from implementation                                                                                        |
| ---- | ------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| R001 | Successful payment with pending order                   | IMPLEMENTED_VERIFIED           | Engine condition, order source loading, and direct finding test                                                     |
| R002 | Successful payment with failed order                    | IMPLEMENTED_UNDERTESTED        | Engine condition and order evidence exist; no direct positive test                                                  |
| R003 | Successful payment with cancelled order                 | IMPLEMENTED_UNDERTESTED        | Engine condition and order evidence exist; no direct positive test                                                  |
| R004 | Failed/cancelled payment with paid order                | IMPLEMENTED_UNDERTESTED        | Engine condition and order evidence exist; no direct positive test                                                  |
| R005 | Pending payment past threshold                          | IMPLEMENTED_VERIFIED           | Engine threshold test covers inclusive boundary and below-threshold behavior                                        |
| R006 | Payment exceeds order by more than 0.01                 | IMPLEMENTED_UNDERTESTED        | Engine compares amounts, but no direct test verifies the specification's 0.01 tolerance                             |
| R007 | Successful payment is below order by more than 0.01     | IMPLEMENTED_UNDERTESTED        | Engine compares amounts, but no direct test verifies the specification's 0.01 tolerance                             |
| R008 | Payment/order currency mismatch                         | IMPLEMENTED_UNDERTESTED        | Engine condition and order evidence exist; no direct positive test                                                  |
| R009 | Over-collection across successful payments for an order | BLOCKED_QUERY_OR_EVIDENCE      | Payment/order tables exist, but source loading has no order-level aggregate                                         |
| R010 | Multiple successful payments for one order              | BLOCKED_QUERY_OR_EVIDENCE      | Payment/order tables exist, but source loading is for one payment only                                              |
| R011 | Verified webhook not processed past threshold           | IMPLEMENTED_UNDERTESTED        | Webhook evidence and engine condition exist; direct positive threshold test is absent                               |
| R012 | Unverified webhook was processed                        | IMPLEMENTED_VERIFIED           | Engine condition and direct mismatch test                                                                           |
| R013 | Duplicate processed provider event ID                   | NOT_STARTED_SCHEMA_OR_EXTERNAL | Webhook schema stores `event_id`, not the specification's `provider_event_id`; no aggregate evaluation              |
| R014 | Payment webhook has no matching payment                 | BLOCKED_QUERY_OR_EVIDENCE      | Nullable webhook payment relationship exists, but event type is not normalized/loaded                               |
| R015 | Capture webhook contradicts failed payment              | BLOCKED_QUERY_OR_EVIDENCE      | Payment and webhook status exist, but normalized evidence omits `event_type`                                        |
| R016 | Webhook retries exceed maximum                          | BLOCKED_QUERY_OR_EVIDENCE      | `retry_count` and `max_retries` exist in PostgreSQL, but are not loaded into evidence                               |
| R017 | Received webhook delayed more than two hours            | BLOCKED_QUERY_OR_EVIDENCE      | Received timestamp/status exist, but no rule or direct source evaluation exists                                     |
| R018 | Fresh capture webhook with stale payment status         | BLOCKED_QUERY_OR_EVIDENCE      | Payment and webhook timestamps/status exist, but `event_type` is not loaded                                         |
| R019 | Failure webhook contradicts successful payment          | BLOCKED_QUERY_OR_EVIDENCE      | Payment and webhook status exist, but normalized evidence omits `event_type`                                        |
| R020 | Webhook received after settled settlement               | PARTIAL_OR_MISIDENTIFIED       | Engine labels a different no-ledger condition as R020; settlement timing is not loaded                              |
| R021 | Successful payment has no ledger entry                  | PARTIAL_OR_MISIDENTIFIED       | Engine labels this condition R020, not R021                                                                         |
| R022 | Posted ledger for failed/cancelled/expired payment      | BLOCKED_QUERY_OR_EVIDENCE      | Current payment and latest ledger status are loaded, but no R022 evaluation exists                                  |
| R023 | Payment-credit ledger amount mismatch                   | BLOCKED_QUERY_OR_EVIDENCE      | Amounts are loaded, but ledger `entry_type` is not normalized                                                       |
| R024 | Duplicate posted payment-credit ledger entries          | BLOCKED_QUERY_OR_EVIDENCE      | Ledger table exists, but source loading has no ledger aggregate                                                     |
| R025 | Ledger pending beyond one hour                          | BLOCKED_QUERY_OR_EVIDENCE      | Ledger status exists, but ledger age is not loaded                                                                  |
| R026 | Journal debit/credit imbalance                          | BLOCKED_QUERY_OR_EVIDENCE      | Journal lines exist and ingestion validates them, but investigation evidence omits lines                            |
| R027 | Unexpected ledger account code                          | BLOCKED_QUERY_OR_EVIDENCE      | Ledger accounts exist, but account code/allowlist is not in evidence                                                |
| R028 | Reversed ledger without payment reversal reason         | NOT_STARTED_SCHEMA_OR_EXTERNAL | Reversal reason and corresponding payment reversal history are absent                                               |
| R029 | Refund debit without refund payment status              | BLOCKED_QUERY_OR_EVIDENCE      | Ledger entry type is not loaded into evidence                                                                       |
| R030 | Missing fee debit above threshold                       | BLOCKED_QUERY_OR_EVIDENCE      | Ledger rows exist, but entry-type aggregate and fee threshold evidence are absent                                   |
| R031 | Successful payment missing settlement past threshold    | BLOCKED_QUERY_OR_EVIDENCE      | Payment/settlement presence is loaded, but settlement threshold configuration/timing is absent                      |
| R032 | Settlement net amount reconciliation mismatch           | NOT_STARTED_SCHEMA_OR_EXTERNAL | Current settlement model lacks net amount, fees, and allocation amounts                                             |
| R033 | Settled settlement includes pending payment             | BLOCKED_QUERY_OR_EVIDENCE      | Payment and latest linked settlement status are loaded; no R033 evaluation exists                                   |
| R034 | Past-due pending settlement                             | BLOCKED_QUERY_OR_EVIDENCE      | Settlement date exists in PostgreSQL but is not normalized into evidence                                            |
| R035 | Failed payment included in settlement                   | BLOCKED_QUERY_OR_EVIDENCE      | Tenant-safe settlement links and payment status exist; no R035 evaluation exists                                    |
| R036 | Settlement/payment currency mismatch                    | BLOCKED_QUERY_OR_EVIDENCE      | Both currencies are loaded; no R036 evaluation exists                                                               |
| R037 | Payment appears in multiple settlements                 | BLOCKED_QUERY_OR_EVIDENCE      | Settlement links exist, but source loading selects only one settlement                                              |
| R038 | Settled settlement has no UTR                           | BLOCKED_QUERY_OR_EVIDENCE      | UTR exists in the settlement table but is not loaded into evidence                                                  |
| R039 | Full pipeline stall                                     | PARTIAL_OR_MISIDENTIFIED       | Current R021 is only success + pending order + no ledger and omits webhook state; no R039 ID                        |
| R040 | Paid/order-complete payment missing settlement          | BLOCKED_QUERY_OR_EVIDENCE      | Required payment/order/webhook/settlement facts are available, but no rule/threshold evaluation exists              |
| R041 | Failed payment with paid order                          | NOT_STARTED_SCHEMA_OR_EXTERNAL | The same condition is coded as R004, but the specification assigns R041 and AI metadata differs                     |
| R042 | Processed webhook and ledger with pending order         | BLOCKED_QUERY_OR_EVIDENCE      | All core fields are available, but no R042 evaluation exists                                                        |
| R043 | Refund debit for failed/cancelled payment               | BLOCKED_QUERY_OR_EVIDENCE      | Payment status exists, but ledger entry type is not loaded                                                          |
| R044 | Completed pre-settlement pipeline with no settlement    | BLOCKED_QUERY_OR_EVIDENCE      | Core evidence is available, but no R044 evaluation exists                                                           |
| R045 | Disputed payment without open incident                  | NOT_STARTED_SCHEMA_OR_EXTERNAL | No open-incident evidence/query is implemented                                                                      |
| R046 | Cancelled payment with unreversed posted ledger         | NOT_STARTED_SCHEMA_OR_EXTERNAL | Reversal-entry history is not represented in normalized evidence                                                    |
| R047 | Initiated payment has no subsequent status event        | NOT_STARTED_SCHEMA_OR_EXTERNAL | Payment status history/event stream is absent                                                                       |
| R048 | Capture latency exceeds 24 hours                        | NOT_STARTED_SCHEMA_OR_EXTERNAL | Initiated/captured timestamps are absent from the current payment model                                             |
| R049 | Webhook processed before received                       | BLOCKED_QUERY_OR_EVIDENCE      | `processed_at` exists in PostgreSQL but is omitted from normalized webhook evidence                                 |
| R050 | Ledger posted before payment capture                    | NOT_STARTED_SCHEMA_OR_EXTERNAL | Payment capture timestamp and ledger posted timestamp are not both available                                        |
| R051 | Settlement settled before payment capture               | NOT_STARTED_SCHEMA_OR_EXTERNAL | Payment capture and settlement settled timestamps are not both normalized                                           |
| R052 | Burst of failed payments                                | BLOCKED_QUERY_OR_EVIDENCE      | Payment statuses/timestamps exist, but no rolling aggregate query/rule exists                                       |
| R053 | Repeated failure by payment method                      | NOT_STARTED_SCHEMA_OR_EXTERNAL | `payment_method` is absent from the current payment model                                                           |
| R054 | Repeated failure by failure code                        | NOT_STARTED_SCHEMA_OR_EXTERNAL | `failure_code` is absent from the current payment model                                                             |
| R055 | Webhook failure storm                                   | BLOCKED_QUERY_OR_EVIDENCE      | Webhook status/timestamps exist, but no rolling aggregate query/rule exists                                         |
| R056 | Failure rate above threshold                            | BLOCKED_QUERY_OR_EVIDENCE      | Payment statuses exist, but no rolling aggregate query/rule exists                                                  |
| R057 | Average capture latency pattern                         | NOT_STARTED_SCHEMA_OR_EXTERNAL | Initiated/captured timestamps are absent                                                                            |
| R058 | Repeated failures by customer                           | NOT_STARTED_SCHEMA_OR_EXTERNAL | `customer_id` is absent from the current payment model                                                              |
| R059 | Idempotency key reused with different amounts           | NOT_STARTED_SCHEMA_OR_EXTERNAL | `idempotency_key` is absent from the current payment model                                                          |
| R060 | Duplicate provider reference across payments            | IMPLEMENTED_VERIFIED           | Authoritative payment columns, tenant-scoped query, deterministic CRITICAL finding, unit and live integration tests |
| R061 | Webhook source IP outside provider allowlist            | NOT_STARTED_SCHEMA_OR_EXTERNAL | Source IP and provider allowlist are absent                                                                         |
| R062 | Payment amount changed between initiation and capture   | NOT_STARTED_SCHEMA_OR_EXTERNAL | No payment audit trail or capture snapshot exists                                                                   |
| R063 | Refunded amount exceeds captured amount                 | NOT_STARTED_SCHEMA_OR_EXTERNAL | Captured/refunded amount fields are absent                                                                          |

## Coverage summary

- **Implemented and directly verified:** 4 rules — R001, R005, R012, and R060.
- **Implemented but under-tested:** 7 rules — R002-R004, R006-R008, and R011.
- **Partial or misidentified:** 3 rules — R020, R021, R039, with R041 sharing a condition under the wrong ID (4 affected IDs).
- **Blocked primarily by missing evidence queries/normalization:** 31 rules — R009, R010, R014-R019, R022-R027, R029-R031, R033-R038, R040, R042-R044, R049, R052, R055, and R056.
- **Not started because required schema, audit, incident, or external data is absent:** 18 rules — R013, R028, R032, R041, R045-R048, R050-R051, R053-R054, R057-R059, and R061-R063.

The counts intentionally distinguish a rule whose data exists but is not queried from a rule that
cannot be implemented without changing the authoritative model. They do not imply full rule
coverage, AI coverage, or production readiness.

## Priority order

1. Correct the R020/R021/R039/R041 rule-ID and semantics mismatch before adding new coverage.
2. Add direct boundary tests for the already-coded POM and webhook rules, including the
   specification's `0.01` tolerance for R006/R007.
3. Implement evidence-query-only rules that require no schema change: R022, R033, R035,
   R036, R042, and R044.
4. Add bounded aggregate queries for R009/R010, R024, R037, R052, R055, and R056 with
   tenant-scoped indexes only after measuring query plans.
5. Defer schema-dependent families such as customer, idempotency, capture-history, fee,
   refund, source-IP, and settlement reconciliation rules until their authoritative semantics
   are specified and represented.
