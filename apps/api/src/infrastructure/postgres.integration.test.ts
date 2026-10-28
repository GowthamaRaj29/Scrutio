import assert from 'node:assert/strict';
import test from 'node:test';
import { loadConfig } from '../config/index.js';
import { runMigrations } from './migrations/run-migrations.js';
import { Database } from './postgres/database.js';
import { PostgresPaymentRepository } from './repositories/postgres-payment-repository.js';

const config = loadConfig();

void test('PostgreSQL migration and tenant-scoped payment lookup', async (context) => {
  if (config.databaseUrl === undefined) {
    context.skip('DATABASE_URL is not configured; run this test against real PostgreSQL');
    return;
  }

  await runMigrations(config.databaseAdminUrl ?? config.databaseUrl);
  const database = new Database(config.databaseUrl);
  const organizationId = '00000000-0000-0000-0000-000000000001';
  const otherOrganizationId = '00000000-0000-0000-0000-000000000002';
  try {
    await database.query(
      `INSERT INTO organizations (id, slug, name)
       VALUES ($1, 'fastmart', 'FastMart'), ($2, 'quickeats', 'QuickEats')
       ON CONFLICT (id) DO NOTHING`,
      [organizationId, otherOrganizationId],
    );
    await database.withTransaction(organizationId, async (client) => {
      await client.query(
        `INSERT INTO payments (
           organization_id, payment_id, amount, status, order_status,
           webhook_processed, ledger_entry_present
         ) VALUES ($1, 'PAY-DB-001', 1000.00, 'SUCCESS', 'PAID', true, true)
         ON CONFLICT (organization_id, payment_id) DO UPDATE SET status = EXCLUDED.status`,
        [organizationId],
      );
    });
    await database.withTransaction(otherOrganizationId, async (client) => {
      await client.query(
        `INSERT INTO payments (
           organization_id, payment_id, amount, status, order_status,
           webhook_processed, ledger_entry_present
         ) VALUES ($1, 'PAY-DB-001', 2000.00, 'FAILED', 'PAYMENT_FAILED', true, false)
         ON CONFLICT (organization_id, payment_id) DO UPDATE SET status = EXCLUDED.status`,
        [otherOrganizationId],
      );
    });

    const fastMartPayment = await database.withTransaction(organizationId, async (client) =>
      new PostgresPaymentRepository(client).findByOrganizationAndPaymentId(
        organizationId,
        'PAY-DB-001',
      ),
    );
    assert.equal(fastMartPayment?.status, 'SUCCESS');

    const crossTenantPayment = await database.withTransaction(organizationId, async (client) =>
      new PostgresPaymentRepository(client).findByOrganizationAndPaymentId(
        otherOrganizationId,
        'PAY-DB-001',
      ),
    );
    assert.equal(crossTenantPayment, null);
    const contextClearedCount = await database.withTransaction(null, async (client) => {
      const result = await client.query<{ count: string }>(
        'SELECT COUNT(*)::text AS count FROM payments',
      );
      return result.rows[0]?.count;
    });
    assert.equal(contextClearedCount, '0');
  } finally {
    await database.withTransaction(organizationId, async (client) => {
      await client.query('DELETE FROM payments WHERE payment_id = $1', ['PAY-DB-001']);
    });
    await database.withTransaction(otherOrganizationId, async (client) => {
      await client.query('DELETE FROM payments WHERE payment_id = $1', ['PAY-DB-001']);
    });
    await database.query('DELETE FROM organizations WHERE id IN ($1, $2)', [
      organizationId,
      otherOrganizationId,
    ]);
    await database.close();
  }
});
