import assert from 'node:assert/strict';
import test from 'node:test';
import { loadConfig } from '../config/index.js';
import { InvestigationEngine } from '../services/investigation-engine.js';
import { runMigrations } from './migrations/run-migrations.js';
import { InvestigationSourceRepository } from './repositories/postgres-investigation-source-repository.js';
import { Database } from './postgres/database.js';

const config = loadConfig();

void test('PostgreSQL investigation evidence remains tenant-scoped for ledger and settlement rules', async (context) => {
  if (config.databaseUrl === undefined) {
    context.skip('DATABASE_URL is not configured; run this test against real PostgreSQL');
    return;
  }

  await runMigrations(config.databaseAdminUrl ?? config.databaseUrl);
  const adminDatabase = new Database(config.databaseAdminUrl ?? config.databaseUrl);
  const appDatabase = new Database(config.databaseUrl);
  const organizationId = '11111111-1111-4111-8111-111111111111';
  const otherOrganizationId = '22222222-2222-4222-8222-222222222222';
  const accountId = '33333333-3333-4333-8333-333333333333';
  const settlementId = '44444444-4444-4444-8444-444444444444';
  const secondSettlementId = '55555555-5555-4555-8555-555555555555';
  const downstreamAccountId = '66666666-6666-4666-8666-666666666666';
  try {
    await adminDatabase.query(
      `INSERT INTO organizations (id, slug, name)
       VALUES ($1, 'rule-evidence-a', 'Rule Evidence A'), ($2, 'rule-evidence-b', 'Rule Evidence B')
       ON CONFLICT (id) DO NOTHING`,
      [organizationId, otherOrganizationId],
    );
    await adminDatabase.query(
      `INSERT INTO orders (organization_id, order_id, status, amount, currency)
       VALUES ($1, 'RULE-ORDER-001', 'PAID', 100.00, 'INR')
       ON CONFLICT (organization_id, order_id) DO UPDATE SET status = EXCLUDED.status`,
      [organizationId],
    );
    await adminDatabase.query(
      `INSERT INTO payments
         (organization_id, payment_id, order_id, amount, status, order_status,
          webhook_processed, ledger_entry_present)
       VALUES
         ($1, 'RULE-PAYMENT-001', 'RULE-ORDER-001', 100.00, 'FAILED', 'PAID', true, true),
         ($1, 'RULE-PAYMENT-002', 'RULE-ORDER-001', 100.00, 'SUCCESS', 'PAID', true, true),
         ($1, 'RULE-PAYMENT-003', 'RULE-ORDER-001', 100.00, 'SUCCESS', 'PAID', true, true),
         ($1, 'RULE-MISSING-EVIDENCE', NULL, 100.00, 'SUCCESS', NULL, false, false),
         ($2, 'RULE-PAYMENT-001', NULL, 200.00, 'SUCCESS', 'PAID', true, true)
       ON CONFLICT (organization_id, payment_id) DO UPDATE
         SET status = EXCLUDED.status, order_status = EXCLUDED.order_status`,
      [organizationId, otherOrganizationId],
    );
    const patternPayments = Array.from(
      { length: 10 },
      (_, index) => `RULE-PATTERN-${String(index + 1)}`,
    );
    for (const [index, patternPaymentId] of patternPayments.entries()) {
      await adminDatabase.query(
        `INSERT INTO payments
           (organization_id, payment_id, amount, status, order_status,
            webhook_processed, ledger_entry_present, updated_at)
         VALUES ($1, $2, 100.00, $3, 'PAID', true, true, '2026-10-28T11:30:00Z')
         ON CONFLICT (organization_id, payment_id) DO NOTHING`,
        [organizationId, patternPaymentId, index < 6 ? 'FAILED' : 'SUCCESS'],
      );
      await adminDatabase.query(
        `INSERT INTO provider_payment_events
           (organization_id, payment_id, provider, provider_event_id, observed_status, observed_at)
         VALUES ($1, $2, 'test-provider', $3, $4, '2026-10-28T11:30:00Z')`,
        [
          organizationId,
          patternPaymentId,
          `RULE-PATTERN-EVENT-${String(index + 1)}`,
          index < 6 ? 'FAILED' : 'SUCCESS',
        ],
      );
    }
    for (let index = 0; index < 13; index += 1) {
      await adminDatabase.query(
        `INSERT INTO webhook_events
           (organization_id, event_id, payment_id, event_type, signature_verified,
            processing_status, received_at)
         VALUES ($1, $2, 'RULE-PATTERN-1', 'payment.failed', true, 'FAILED',
                 '2026-10-28T11:55:00Z')`,
        [organizationId, `RULE-PATTERN-WEBHOOK-${String(index + 1)}`],
      );
    }
    await adminDatabase.query(
      `INSERT INTO ledger_accounts (id, organization_id, account_code, account_type)
       VALUES ($1, $2, 'RULE-CASH', 'ASSET')
       ON CONFLICT (organization_id, id) DO NOTHING`,
      [accountId, organizationId],
    );
    await adminDatabase.query(
      `INSERT INTO ledger_accounts (id, organization_id, account_code, account_type)
       VALUES ($1, $2, 'RULE-DOWNSTREAM', 'ASSET')
       ON CONFLICT (organization_id, id) DO NOTHING`,
      [downstreamAccountId, organizationId],
    );
    await adminDatabase.query(
      `INSERT INTO orders (organization_id, order_id, status, amount, currency)
       VALUES
         ($1, 'RULE-ORDER-OVER', 'PAYMENT_FAILED', 100.00, 'INR'),
         ($1, 'RULE-ORDER-UNDER', 'CANCELLED', 100.00, 'INR'),
         ($1, 'RULE-ORDER-CURRENCY', 'PAID', 100.00, 'USD'),
         ($1, 'RULE-ORDER-SETTLE-PENDING', 'PAID', 100.00, 'INR'),
         ($1, 'RULE-ORDER-SETTLE-MISMATCH', 'PAID', 100.00, 'INR'),
         ($1, 'RULE-ORDER-DOWNSTREAM', 'PENDING', 100.00, 'INR'),
         ($1, 'RULE-ORDER-PRESETTLE', 'PAID', 100.00, 'INR')
       ON CONFLICT (organization_id, order_id) DO UPDATE
         SET status = EXCLUDED.status, amount = EXCLUDED.amount, currency = EXCLUDED.currency`,
      [organizationId],
    );
    await adminDatabase.query(
      `INSERT INTO payments
         (organization_id, payment_id, order_id, amount, currency, status, order_status,
          webhook_processed, ledger_entry_present)
       VALUES
         ($1, 'RULE-POM-OVER', 'RULE-ORDER-OVER', 100.02, 'INR', 'SUCCESS', 'PAYMENT_FAILED', true, false),
         ($1, 'RULE-POM-UNDER', 'RULE-ORDER-UNDER', 99.98, 'INR', 'SUCCESS', 'CANCELLED', true, false),
         ($1, 'RULE-POM-CURRENCY', 'RULE-ORDER-CURRENCY', 100.00, 'INR', 'SUCCESS', 'PAID', true, false),
         ($1, 'RULE-SETTLE-PENDING', 'RULE-ORDER-SETTLE-PENDING', 100.00, 'INR', 'PENDING', 'PAID', true, false),
         ($1, 'RULE-SETTLE-MISMATCH', 'RULE-ORDER-SETTLE-MISMATCH', 100.00, 'INR', 'SUCCESS', 'PAID', true, true),
         ($1, 'RULE-DOWNSTREAM', 'RULE-ORDER-DOWNSTREAM', 100.00, 'INR', 'SUCCESS', 'PENDING', true, true),
         ($1, 'RULE-PRESETTLE', 'RULE-ORDER-PRESETTLE', 100.00, 'INR', 'SUCCESS', 'PAID', true, true)
       ON CONFLICT (organization_id, payment_id) DO UPDATE
         SET order_id = EXCLUDED.order_id, amount = EXCLUDED.amount, currency = EXCLUDED.currency,
             status = EXCLUDED.status, order_status = EXCLUDED.order_status,
             webhook_processed = EXCLUDED.webhook_processed,
             ledger_entry_present = EXCLUDED.ledger_entry_present`,
      [organizationId],
    );
    await adminDatabase.query(
      `INSERT INTO webhook_events
         (organization_id, event_id, payment_id, event_type, signature_verified,
          processing_status, received_at)
       VALUES
         ($1, 'RULE-POM-OVER-WEBHOOK', 'RULE-POM-OVER', 'payment.captured', true, 'RECEIVED',
                 '2026-10-28T11:00:00Z'),
         ($1, 'RULE-DOWNSTREAM-WEBHOOK', 'RULE-DOWNSTREAM', 'payment.captured', true, 'PROCESSED',
                 '2026-10-28T11:55:00Z')`,
      [organizationId],
    );
    await adminDatabase.query(
      `INSERT INTO ledger_entries
         (organization_id, payment_id, account_id, entry_type, status, amount, currency, posted_at)
       VALUES
         ($1, 'RULE-DOWNSTREAM', $2, 'PAYMENT_CREDIT', 'POSTED', 100.00, 'INR', '2026-10-28T11:30:00Z'),
         ($1, 'RULE-PRESETTLE', $2, 'PAYMENT_CREDIT', 'POSTED', 100.00, 'INR', '2026-10-28T11:30:00Z')`,
      [organizationId, downstreamAccountId],
    );
    await adminDatabase.query(
      `INSERT INTO settlements
         (organization_id, settlement_id, status, amount, currency, settlement_date, settled_at)
       VALUES
         ($1, 'RULE-SETTLE-PENDING', 'SETTLED', 100.00, 'INR', CURRENT_DATE, NOW()),
         ($1, 'RULE-SETTLE-MISMATCH', 'SETTLED', 100.00, 'USD', CURRENT_DATE, NOW())`,
      [organizationId],
    );
    await adminDatabase.query(
      `INSERT INTO settlement_payments (organization_id, settlement_id, payment_id)
       VALUES
         ($1, (SELECT id FROM settlements WHERE organization_id = $1 AND settlement_id = 'RULE-SETTLE-PENDING'), 'RULE-SETTLE-PENDING'),
         ($1, (SELECT id FROM settlements WHERE organization_id = $1 AND settlement_id = 'RULE-SETTLE-MISMATCH'), 'RULE-SETTLE-MISMATCH')`,
      [organizationId],
    );
    await adminDatabase.query(
      `INSERT INTO payments
         (organization_id, payment_id, amount, status, order_status,
          webhook_processed, ledger_entry_present)
       VALUES ($1, 'RULE-PENDING-LEDGER', 50.00, 'SUCCESS', 'PAID', true, true)
       ON CONFLICT (organization_id, payment_id) DO NOTHING`,
      [organizationId],
    );
    await adminDatabase.query(
      `INSERT INTO ledger_entries
         (organization_id, payment_id, account_id, entry_type, status, amount, currency, created_at)
       VALUES ($1, 'RULE-PENDING-LEDGER', $2, 'PAYMENT_CREDIT', 'PENDING', 50.00, 'INR',
               '2026-10-28T10:00:00Z')`,
      [organizationId, accountId],
    );
    const ledgerResult = await adminDatabase.query<{ id: string }>(
      `INSERT INTO ledger_entries
         (organization_id, payment_id, account_id, entry_type, status, amount, currency)
       VALUES ($1, 'RULE-PAYMENT-001', $2, 'PAYMENT_CREDIT', 'POSTED', 100.00, 'INR')
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [organizationId, accountId],
    );
    assert.ok(ledgerResult.rows[0]?.id);
    await adminDatabase.query(
      `INSERT INTO ledger_entries
         (organization_id, payment_id, account_id, entry_type, status, amount, currency)
       VALUES ($1, 'RULE-PAYMENT-001', $2, 'PAYMENT_CREDIT', 'POSTED', 101.00, 'INR')`,
      [organizationId, accountId],
    );
    await adminDatabase.query(
      `INSERT INTO ledger_entries
       (organization_id, payment_id, account_id, entry_type, status, amount, currency)
       VALUES ($1, 'RULE-PAYMENT-001', $2, 'REFUND_DEBIT', 'POSTED', 10.00, 'INR')`,
      [organizationId, accountId],
    );
    const journalEntry = await adminDatabase.query<{ id: string }>(
      `INSERT INTO ledger_entries
         (organization_id, payment_id, account_id, entry_type, status, amount, currency)
       VALUES ($1, 'RULE-PAYMENT-001', $2, 'JOURNAL_TEST', 'POSTED', 100.00, 'INR')
       RETURNING id`,
      [organizationId, accountId],
    );
    const journalEntryId = journalEntry.rows[0]?.id;
    assert.ok(journalEntryId);
    await adminDatabase.query(
      `INSERT INTO journal_lines
         (organization_id, ledger_entry_id, direction, amount, currency)
       VALUES ($1, $2, 'DEBIT', 100.00, 'INR'), ($1, $2, 'CREDIT', 99.99, 'INR')`,
      [organizationId, journalEntryId],
    );
    await adminDatabase.query(
      `INSERT INTO settlements
         (id, organization_id, settlement_id, status, amount, currency, settlement_date, settled_at)
       VALUES ($1, $2, 'RULE-SETTLEMENT-001', 'SETTLED', 100.00, 'INR', CURRENT_DATE, NOW())
       ON CONFLICT (organization_id, id) DO NOTHING`,
      [settlementId, organizationId],
    );
    await adminDatabase.query(
      `INSERT INTO settlement_payments (organization_id, settlement_id, payment_id)
       VALUES ($1, $2, 'RULE-PAYMENT-001')
       ON CONFLICT DO NOTHING`,
      [organizationId, settlementId],
    );
    await adminDatabase.query(
      `INSERT INTO settlements
         (id, organization_id, settlement_id, status, amount, currency, settlement_date, settled_at)
       VALUES ($1, $2, 'RULE-SETTLEMENT-002', 'SETTLED', 100.00, 'INR', CURRENT_DATE, NOW())`,
      [secondSettlementId, organizationId],
    );
    await adminDatabase.query(
      `INSERT INTO settlement_payments (organization_id, settlement_id, payment_id)
       VALUES ($1, $2, 'RULE-PAYMENT-001')`,
      [organizationId, secondSettlementId],
    );

    const evidence = await appDatabase.withTransaction(organizationId, (client) =>
      new InvestigationSourceRepository(client, {
        burstFailureWindowHours: 1,
        webhookStormWindowMinutes: 10,
      }).findEvidence(organizationId, 'RULE-PAYMENT-001', '2026-10-28T12:00:00.000Z'),
    );
    assert.ok(evidence);
    const result = new InvestigationEngine().evaluate(evidence, '2026-10-28T12:00:00.000Z');
    assert.equal(
      result.findings.some((finding) => finding.ruleId === 'R022'),
      true,
    );
    assert.equal(
      result.findings.some((finding) => finding.ruleId === 'R009'),
      true,
    );
    assert.equal(
      result.findings.some((finding) => finding.ruleId === 'R010'),
      true,
    );
    assert.equal(
      result.findings.some((finding) => finding.ruleId === 'R024'),
      true,
    );
    assert.equal(
      result.findings.some((finding) => finding.ruleId === 'R035'),
      true,
    );
    assert.equal(
      result.findings.some((finding) => finding.ruleId === 'R037'),
      true,
    );
    assert.equal(
      result.findings.find((finding) => finding.ruleId === 'R023')?.severity,
      'CRITICAL',
    );
    assert.equal(result.findings.find((finding) => finding.ruleId === 'R029')?.severity, 'HIGH');
    assert.equal(
      result.findings.find((finding) => finding.ruleId === 'R043')?.severity,
      'CRITICAL',
    );
    assert.equal(
      result.findings.find((finding) => finding.ruleId === 'R026')?.severity,
      'CRITICAL',
    );
    const pendingEvidence = await appDatabase.withTransaction(organizationId, (client) =>
      new InvestigationSourceRepository(client, {
        burstFailureWindowHours: 1,
        webhookStormWindowMinutes: 10,
      }).findEvidence(organizationId, 'RULE-PENDING-LEDGER', '2026-10-28T12:00:00.000Z'),
    );
    assert.ok(pendingEvidence);
    assert.equal(
      new InvestigationEngine()
        .evaluate(pendingEvidence, '2026-10-28T12:00:00.000Z')
        .findings.find((finding) => finding.ruleId === 'R025')?.severity,
      'MEDIUM',
    );
    assert.equal(
      result.findings.some((finding) => finding.ruleId === 'R036'),
      false,
    );
    assert.equal(result.findings.find((finding) => finding.ruleId === 'R052')?.severity, 'HIGH');
    assert.equal(result.findings.find((finding) => finding.ruleId === 'R055')?.severity, 'HIGH');
    assert.equal(result.findings.find((finding) => finding.ruleId === 'R056')?.severity, 'HIGH');

    const directCases = [
      ['RULE-POM-OVER', ['R002', 'R006', 'R011']],
      ['RULE-POM-UNDER', ['R003', 'R007']],
      ['RULE-POM-CURRENCY', ['R008']],
      ['RULE-SETTLE-PENDING', ['R033']],
      ['RULE-SETTLE-MISMATCH', ['R036']],
      ['RULE-DOWNSTREAM', ['R042']],
      ['RULE-PRESETTLE', ['R044']],
    ] as const;
    for (const [paymentId, expectedRules] of directCases) {
      const caseEvidence = await appDatabase.withTransaction(organizationId, (client) =>
        new InvestigationSourceRepository(client, {
          burstFailureWindowHours: 1,
          webhookStormWindowMinutes: 10,
        }).findEvidence(organizationId, paymentId, '2026-10-28T12:00:00.000Z'),
      );
      assert.ok(caseEvidence);
      const caseResult = new InvestigationEngine().evaluate(
        caseEvidence,
        '2026-10-28T12:00:00.000Z',
      );
      for (const ruleId of expectedRules) {
        assert.equal(
          caseResult.evaluations.find((item) => item.ruleId === ruleId)?.status,
          'MATCH',
        );
      }
      const repeatedEvidence = await appDatabase.withTransaction(organizationId, (client) =>
        new InvestigationSourceRepository(client, {
          burstFailureWindowHours: 1,
          webhookStormWindowMinutes: 10,
        }).findEvidence(organizationId, paymentId, '2026-10-28T12:00:00.000Z'),
      );
      assert.deepEqual(repeatedEvidence, caseEvidence);
    }

    const missingOrderEvidence = await appDatabase.withTransaction(organizationId, (client) =>
      new InvestigationSourceRepository(client, {
        burstFailureWindowHours: 1,
        webhookStormWindowMinutes: 10,
      }).findEvidence(organizationId, 'RULE-MISSING-EVIDENCE', '2026-10-28T12:00:00.000Z'),
    );
    assert.ok(missingOrderEvidence);
    const missingResult = new InvestigationEngine().evaluate(
      missingOrderEvidence,
      '2026-10-28T12:00:00.000Z',
    );
    for (const ruleId of [
      'R002',
      'R003',
      'R006',
      'R007',
      'R008',
      'R011',
      'R033',
      'R036',
      'R042',
      'R044',
    ]) {
      assert.equal(
        missingResult.evaluations.find((item) => item.ruleId === ruleId)?.status,
        'INSUFFICIENT_EVIDENCE',
      );
    }

    const crossTenantEvidence = await appDatabase.withTransaction(organizationId, (client) =>
      new InvestigationSourceRepository(client, {
        burstFailureWindowHours: 1,
        webhookStormWindowMinutes: 10,
      }).findEvidence(organizationId, 'RULE-PAYMENT-001', '2026-10-28T12:00:00.000Z'),
    );
    assert.equal(crossTenantEvidence?.payment.organizationId, organizationId);
    assert.equal(
      await appDatabase.withTransaction(organizationId, (client) =>
        new InvestigationSourceRepository(client, {
          burstFailureWindowHours: 1,
          webhookStormWindowMinutes: 10,
        }).findEvidence(otherOrganizationId, 'RULE-PAYMENT-001', '2026-10-28T12:00:00.000Z'),
      ),
      null,
    );
    assert.equal(
      await appDatabase.withTransaction(otherOrganizationId, (client) =>
        new InvestigationSourceRepository(client, {
          burstFailureWindowHours: 1,
          webhookStormWindowMinutes: 10,
        }).findEvidence(organizationId, 'RULE-PAYMENT-001', '2026-10-28T12:00:00.000Z'),
      ),
      null,
    );
  } finally {
    await adminDatabase.query('DELETE FROM webhook_events WHERE organization_id IN ($1, $2)', [
      organizationId,
      otherOrganizationId,
    ]);
    await adminDatabase.query(
      'DELETE FROM provider_payment_events WHERE organization_id IN ($1, $2)',
      [organizationId, otherOrganizationId],
    );
    await adminDatabase.query('DELETE FROM settlements WHERE organization_id IN ($1, $2)', [
      organizationId,
      otherOrganizationId,
    ]);
    await adminDatabase.query('DELETE FROM ledger_entries WHERE organization_id IN ($1, $2)', [
      organizationId,
      otherOrganizationId,
    ]);
    await adminDatabase.query('DELETE FROM ledger_accounts WHERE organization_id IN ($1, $2)', [
      organizationId,
      otherOrganizationId,
    ]);
    await adminDatabase.query('DELETE FROM payments WHERE organization_id IN ($1, $2)', [
      organizationId,
      otherOrganizationId,
    ]);
    await adminDatabase.query('DELETE FROM orders WHERE organization_id IN ($1, $2)', [
      organizationId,
      otherOrganizationId,
    ]);
    await adminDatabase.query('DELETE FROM organizations WHERE id IN ($1, $2)', [
      organizationId,
      otherOrganizationId,
    ]);
    await adminDatabase.close();
    await appDatabase.close();
  }
});
