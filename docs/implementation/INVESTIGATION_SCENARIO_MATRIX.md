# Deterministic investigation scenario matrix

Status values: `PASS`, `IMPLEMENTED_NOT_VERIFIED`, `BLOCKED`.

The current PostgreSQL schema contains payment records and authentication data, but not authoritative
orders, webhook events, ledger entries, settlements, or pattern aggregates. The engine therefore
implements only rules whose inputs can be represented safely by the current payment boundary and
explicit optional evidence. Unsupported rules remain blocked rather than being inferred from absent data.

| Scenario                   | Rule(s)       | Input condition                                                   | Expected outcome                            | Test                           | Status                   |
| -------------------------- | ------------- | ----------------------------------------------------------------- | ------------------------------------------- | ------------------------------ | ------------------------ |
| SC-01                      | R001, R021    | Successful payment, pending order, no ledger                      | Two findings                                | `investigation-engine.test.ts` | PASS                     |
| SC-02                      | R002          | Successful payment, failed order                                  | R002 finding                                | Planned scenario extension     | IMPLEMENTED_NOT_VERIFIED |
| SC-03                      | R003          | Successful payment, cancelled order                               | R003 finding                                | Planned scenario extension     | IMPLEMENTED_NOT_VERIFIED |
| SC-04 | R004 | Failed or cancelled payment, paid order | R004 CRITICAL finding | `investigation-engine.test.ts` | PASS |
| SC-05                      | R005          | Pending payment at threshold                                      | Match at threshold, no match below          | `investigation-engine.test.ts` | PASS                     |
| SC-06/07                   | R006/R007     | Payment amount above/below order amount                           | Correct directional finding                 | Engine unit coverage           | IMPLEMENTED_NOT_VERIFIED |
| SC-08                      | R008          | Payment/order currency mismatch                                   | R008 finding                                | Engine unit coverage           | IMPLEMENTED_NOT_VERIFIED |
| SC-10/11                   | R011/R012     | Unprocessed or unverified webhook                                 | Match only with explicit webhook evidence   | `investigation-engine.test.ts` | PASS                     |
| SC-20/21                   | R020/R021     | Missing ledger with successful payment                            | Finding or insufficient evidence            | `investigation-engine.test.ts` | PASS                     |
| SC-61/62                   | None          | Clean success or clean failure                                    | No unsupported finding                      | Planned integration fixture    | IMPLEMENTED_NOT_VERIFIED |
| Missing evidence           | Multiple      | Missing order/webhook                                             | `INSUFFICIENT_EVIDENCE`, never confirmation | `investigation-engine.test.ts` | PASS                     |
| Invalid input              | Boundary      | Malformed money/timestamp                                         | Validation rejection                        | `investigation-engine.test.ts` | PASS                     |
| Repeat execution           | All supported | Same evidence and evaluation time                                 | Byte-equivalent result                      | `investigation-engine.test.ts` | PASS                     |
| R020 late webhook | R020 | Webhook received after settled settlement | INFO finding or insufficient evidence | `investigation-engine.test.ts` | PASS |
| R039 pipeline stall        | R039          | Successful payment, pending order, unprocessed webhook, no ledger | CRITICAL finding                            | `investigation-engine.test.ts` | PASS                     |
| R041 impossible paid order | R041          | Failed payment and paid order                                     | CRITICAL finding distinct from R004         | `investigation-engine.test.ts` | PASS                     |
| Tenant isolation           | All supported | Session organization differs from evidence                        | Must be enforced before engine invocation   | Auth integration boundary      | BLOCKED                  |

The operational data foundation now provides tables for orders, webhook events, ledger entries,
journal lines, settlements, and persisted investigations. Actual rule coverage is tracked in
`RULE_COVERAGE_AUDIT.md`; this matrix is a scenario view, not proof that every rule is evaluated.
Provider payment event history is available as normalized, tenant-scoped evidence for the latest
observed event. R020 now uses settled-at evidence, R021 is the no-ledger rule, R039 requires an
unprocessed webhook, and R041 is evaluated separately from R004. R060 is complete for
authoritative payment references. Customer/payment-method
aggregates, pattern windows, audit history, and several settlement/ledger fields still require
additional evidence loading or authoritative schema work.

| SC-57 | R060 | Two payment records share `provider_reference_id` | CRITICAL duplicate-reference finding | Engine unit test and PostgreSQL API integration | PASS |
