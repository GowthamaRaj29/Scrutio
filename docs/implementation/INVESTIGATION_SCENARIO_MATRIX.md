# Deterministic investigation scenario matrix

Status values: `PASS`, `IMPLEMENTED_NOT_VERIFIED`, `BLOCKED`.

The current PostgreSQL schema contains payment records and authentication data, but not authoritative
orders, webhook events, ledger entries, settlements, or pattern aggregates. The engine therefore
implements only rules whose inputs can be represented safely by the current payment boundary and
explicit optional evidence. Unsupported rules remain blocked rather than being inferred from absent data.

| Scenario         | Rule(s)          | Input condition                              | Expected outcome                            | Test                           | Status                   |
| ---------------- | ---------------- | -------------------------------------------- | ------------------------------------------- | ------------------------------ | ------------------------ |
| SC-01            | R001, R020, R021 | Successful payment, pending order, no ledger | Three findings                              | `investigation-engine.test.ts` | PASS                     |
| SC-02            | R002             | Successful payment, failed order             | R002 finding                                | Planned scenario extension     | IMPLEMENTED_NOT_VERIFIED |
| SC-03            | R003             | Successful payment, cancelled order          | R003 finding                                | Planned scenario extension     | IMPLEMENTED_NOT_VERIFIED |
| SC-04            | R004             | Failed payment, paid order                   | R004 finding                                | Planned scenario extension     | IMPLEMENTED_NOT_VERIFIED |
| SC-05            | R005             | Pending payment at threshold                 | Match at threshold, no match below          | `investigation-engine.test.ts` | PASS                     |
| SC-06/07         | R006/R007        | Payment amount above/below order amount      | Correct directional finding                 | Engine unit coverage           | IMPLEMENTED_NOT_VERIFIED |
| SC-08            | R008             | Payment/order currency mismatch              | R008 finding                                | Engine unit coverage           | IMPLEMENTED_NOT_VERIFIED |
| SC-10/11         | R011/R012        | Unprocessed or unverified webhook            | Match only with explicit webhook evidence   | `investigation-engine.test.ts` | PASS                     |
| SC-20/21         | R020/R021        | Missing ledger with successful payment       | Finding or insufficient evidence            | `investigation-engine.test.ts` | PASS                     |
| SC-61/62         | None             | Clean success or clean failure               | No unsupported finding                      | Planned integration fixture    | IMPLEMENTED_NOT_VERIFIED |
| Missing evidence | Multiple         | Missing order/webhook                        | `INSUFFICIENT_EVIDENCE`, never confirmation | `investigation-engine.test.ts` | PASS                     |
| Invalid input    | Boundary         | Malformed money/timestamp                    | Validation rejection                        | `investigation-engine.test.ts` | PASS                     |
| Repeat execution | All supported    | Same evidence and evaluation time            | Byte-equivalent result                      | `investigation-engine.test.ts` | PASS                     |
| Tenant isolation | All supported    | Session organization differs from evidence   | Must be enforced before engine invocation   | Auth integration boundary      | BLOCKED                  |

The operational data foundation now provides tables for orders, webhook events, ledger entries,
journal lines, settlements, and persisted investigations. Their upstream ingestion and repositories
are not yet connected to the evaluator, so rules R009-R010, R013-R019, R022-R063 remain
`BLOCKED` or `IMPLEMENTED_NOT_VERIFIED` as documented here. Customer/payment-method aggregates,
provider history, and pattern windows still require source semantics and repository work.
