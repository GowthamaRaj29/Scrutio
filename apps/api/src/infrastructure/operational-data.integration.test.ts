import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { loadConfig } from '../config/index.js';
import { Database } from './postgres/database.js';
import { InvestigationRepository } from './repositories/postgres-investigation-repository.js';

const config = loadConfig();

void test('operational data migration enforces tenant integrity and persists investigations', async (context) => {
  if (config.databaseUrl === undefined) {
    context.skip('DATABASE_URL is not configured; run this test against real PostgreSQL');
    return;
  }
  const adminDatabase = new Database(config.databaseAdminUrl ?? config.databaseUrl);
  const appDatabase = new Database(config.databaseUrl);
  const organizationId = randomUUID();
  const otherOrganizationId = randomUUID();
  const userId = randomUUID();
  const otherUserId = randomUUID();
  const paymentId = `DATA-${userId}`;
  const otherPaymentId = `OTHER-${userId}`;
  try {
    await adminDatabase.query(
      `DELETE FROM investigations
        WHERE organization_id IN (
          SELECT id FROM organizations WHERE slug LIKE 'data-%' OR slug LIKE 'other-%'
        )`,
    );
    await adminDatabase.query(
      `DELETE FROM payments
        WHERE organization_id IN (
          SELECT id FROM organizations WHERE slug LIKE 'data-%' OR slug LIKE 'other-%'
        )`,
    );
    await adminDatabase.query(`DELETE FROM users WHERE email LIKE 'data-%@example.test'`);
    await adminDatabase.query(
      `DELETE FROM organizations WHERE slug LIKE 'data-%' OR slug LIKE 'other-%'`,
    );
    await adminDatabase.query(
      `INSERT INTO organizations (id, slug, name)
       VALUES ($1, $2, 'Operational Test Org'), ($3, $4, 'Other Operational Org')`,
      [organizationId, `data-${userId}`, otherOrganizationId, `other-${userId}`],
    );
    await adminDatabase.query(
      `INSERT INTO users (id, email, password_hash) VALUES ($1, $2, 'test-hash')`,
      [userId, `data-${userId}@example.test`],
    );
    await adminDatabase.query(
      `INSERT INTO users (id, email, password_hash) VALUES ($1, $2, 'test-hash')`,
      [otherUserId, `data-${otherUserId}@example.test`],
    );
    await adminDatabase.query(
      `INSERT INTO organization_memberships (user_id, organization_id, role)
       VALUES ($1, $2, 'analyst')`,
      [userId, organizationId],
    );
    await adminDatabase.query(
      `INSERT INTO organization_memberships (user_id, organization_id, role)
       VALUES ($1, $2, 'analyst')`,
      [otherUserId, otherOrganizationId],
    );
    await adminDatabase.query(
      `INSERT INTO payments (organization_id, payment_id, amount, status)
       VALUES ($1, $2, 100.00, 'SUCCESS'), ($3, $4, 200.00, 'SUCCESS')`,
      [organizationId, paymentId, otherOrganizationId, otherPaymentId],
    );
    await appDatabase.withTransaction(organizationId, async (client) => {
      await client.query(
        `INSERT INTO orders (organization_id, order_id, status, amount, currency)
         VALUES ($1, $2, 'PENDING', 100.00, 'INR')`,
        [organizationId, `ORDER-${userId}`],
      );
      await client.query(
        `UPDATE payments SET order_id = $1 WHERE organization_id = $2 AND payment_id = $3`,
        [`ORDER-${userId}`, organizationId, paymentId],
      );
      await client.query('SAVEPOINT invalid_cross_tenant_reference');
      await assert.rejects(
        () =>
          client.query(
            `INSERT INTO webhook_events
               (organization_id, event_id, payment_id, event_type, signature_verified,
                processing_status, received_at)
             VALUES ($1, $2, $3, 'payment.captured', true, 'RECEIVED', NOW())`,
            [organizationId, `EVENT-${userId}`, otherPaymentId],
          ),
        /violates foreign key constraint/,
      );
      await client.query('ROLLBACK TO SAVEPOINT invalid_cross_tenant_reference');
      await client.query('RELEASE SAVEPOINT invalid_cross_tenant_reference');
      const repository = new InvestigationRepository(client);
      await client.query('SAVEPOINT invalid_cross_tenant_requester');
      await assert.rejects(
        () =>
          repository.create(organizationId, {
            organizationId,
            requestedBy: otherUserId,
            paymentId,
            status: 'PARTIAL',
            ruleSetVersion: '2026-10-28.v1',
            evaluationTimestamp: '2026-10-28T12:00:00.000Z',
            inputFingerprint: 'b'.repeat(64),
          }),
        /violates foreign key constraint/,
      );
      await client.query('ROLLBACK TO SAVEPOINT invalid_cross_tenant_requester');
      await client.query('RELEASE SAVEPOINT invalid_cross_tenant_requester');
      const created = await repository.create(organizationId, {
        organizationId,
        requestedBy: userId,
        paymentId,
        status: 'PARTIAL',
        ruleSetVersion: '2026-10-28.v1',
        evaluationTimestamp: '2026-10-28T12:00:00.000Z',
        inputFingerprint: 'a'.repeat(64),
        result: { status: 'insufficient_evidence' },
      });
      assert.equal(created.organizationId, organizationId);
      const loaded = await repository.findById(organizationId, created.id);
      assert.deepEqual(loaded, created);
      const crossTenant = await repository.findById(otherOrganizationId, created.id);
      assert.equal(crossTenant, null);
    });
  } finally {
    await adminDatabase.query('DELETE FROM investigations WHERE organization_id = $1', [
      organizationId,
    ]);
    await adminDatabase.query('DELETE FROM payments WHERE organization_id IN ($1, $2)', [
      organizationId,
      otherOrganizationId,
    ]);
    await adminDatabase.query('DELETE FROM users WHERE id IN ($1, $2)', [userId, otherUserId]);
    await adminDatabase.query('DELETE FROM organizations WHERE id IN ($1, $2)', [
      organizationId,
      otherOrganizationId,
    ]);
    await appDatabase.close();
    await adminDatabase.close();
  }
});
