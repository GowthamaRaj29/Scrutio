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
         ($2, 'RULE-PAYMENT-001', NULL, 200.00, 'SUCCESS', 'PAID', true, true)
       ON CONFLICT (organization_id, payment_id) DO UPDATE
         SET status = EXCLUDED.status, order_status = EXCLUDED.order_status`,
      [organizationId, otherOrganizationId],
    );
    await adminDatabase.query(
      `INSERT INTO ledger_accounts (id, organization_id, account_code, account_type)
       VALUES ($1, $2, 'RULE-CASH', 'ASSET')
       ON CONFLICT (organization_id, id) DO NOTHING`,
      [accountId, organizationId],
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

    const evidence = await appDatabase.withTransaction(organizationId, (client) =>
      new InvestigationSourceRepository(client).findEvidence(organizationId, 'RULE-PAYMENT-001'),
    );
    assert.ok(evidence);
    const result = new InvestigationEngine().evaluate(evidence, '2026-10-28T12:00:00.000Z');
    assert.equal(
      result.findings.some((finding) => finding.ruleId === 'R022'),
      true,
    );
    assert.equal(
      result.findings.some((finding) => finding.ruleId === 'R035'),
      true,
    );
    assert.equal(
      result.findings.some((finding) => finding.ruleId === 'R036'),
      false,
    );

    const crossTenantEvidence = await appDatabase.withTransaction(organizationId, (client) =>
      new InvestigationSourceRepository(client).findEvidence(organizationId, 'RULE-PAYMENT-001'),
    );
    assert.equal(crossTenantEvidence?.payment.organizationId, organizationId);
  } finally {
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
