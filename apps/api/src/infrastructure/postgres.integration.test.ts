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

    await database.withTransaction(organizationId, async (client) => {
      const hidden = await client.query<{ count: string }>(
        'SELECT COUNT(*)::text AS count FROM payments WHERE organization_id = $1',
        [otherOrganizationId],
      );
      assert.equal(hidden.rows[0]?.count, '0');
      const updated = await client.query(
        `UPDATE payments SET amount = 999.00
          WHERE organization_id = $1 AND payment_id = 'PAY-DB-001'`,
        [otherOrganizationId],
      );
      assert.equal(updated.rowCount, 0);
      const deleted = await client.query(
        `DELETE FROM payments
          WHERE organization_id = $1 AND payment_id = 'PAY-DB-001'`,
        [otherOrganizationId],
      );
      assert.equal(deleted.rowCount, 0);
      await assert.rejects(
        () =>
          client.query(
            `INSERT INTO payments
               (organization_id, payment_id, amount, status)
             VALUES ($1, 'PAY-DB-CROSS-TENANT-INSERT', 1.00, 'SUCCESS')`,
            [otherOrganizationId],
          ),
        /row-level security|policy/,
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
    const reusedTenantCount = await database.withTransaction(
      otherOrganizationId,
      async (client) => {
        const result = await client.query<{ count: string }>(
          'SELECT COUNT(*)::text AS count FROM payments',
        );
        return result.rows[0]?.count;
      },
    );
    assert.equal(reusedTenantCount, '1');
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

void test('application role enforces forced RLS and immutable investigation history', async (context) => {
  if (config.databaseUrl === undefined) {
    context.skip('DATABASE_URL is not configured; run this test against real PostgreSQL');
    return;
  }

  await runMigrations(config.databaseAdminUrl ?? config.databaseUrl);
  const database = new Database(config.databaseUrl, 4);
  const adminDatabase = new Database(config.databaseAdminUrl ?? config.databaseUrl);
  const organizationId = '00000000-0000-0000-0000-000000000011';
  const otherOrganizationId = '00000000-0000-0000-0000-000000000012';
  const userId = '00000000-0000-0000-0000-000000000013';
  const tables = [
    'investigations',
    'investigation_findings',
    'investigation_evidence_references',
  ] as const;
  try {
    const identity = await database.query<{
      current_user: string;
      superuser: boolean;
      bypassrls: boolean;
    }>(
      `SELECT current_user, rolsuper AS superuser, rolbypassrls AS bypassrls
         FROM pg_roles
        WHERE rolname = current_user`,
    );
    assert.equal(identity.rows.length, 1);
    const identityRow = identity.rows[0];
    assert.ok(identityRow);
    assert.equal(identityRow.superuser, false);
    assert.equal(identityRow.bypassrls, false);
    const memberships = await database.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
         FROM pg_auth_members
        WHERE member = current_user::regrole`,
    );
    const membershipRow = memberships.rows[0];
    assert.ok(membershipRow);
    assert.equal(membershipRow.count, '0');

    for (const table of tables) {
      const privileges = await database.query<{ can_update: boolean; can_delete: boolean }>(
        `SELECT has_table_privilege(current_user, $1, 'UPDATE') AS can_update,
                has_table_privilege(current_user, $1, 'DELETE') AS can_delete`,
        [table],
      );
      const privilegeRow = privileges.rows[0];
      assert.ok(privilegeRow);
      assert.equal(privilegeRow.can_update, false);
      assert.equal(privilegeRow.can_delete, false);
      const rls = await database.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
        `SELECT relrowsecurity, relforcerowsecurity
           FROM pg_class
          WHERE oid = $1::regclass`,
        [table],
      );
      const rlsRow = rls.rows[0];
      assert.ok(rlsRow);
      assert.equal(rlsRow.relrowsecurity, true);
      assert.equal(rlsRow.relforcerowsecurity, true);
    }

    await database.query(
      `INSERT INTO organizations (id, slug, name)
       VALUES ($1, 'immutability-one', 'Immutability One'),
              ($2, 'immutability-two', 'Immutability Two')
       ON CONFLICT (id) DO NOTHING`,
      [organizationId, otherOrganizationId],
    );
    await adminDatabase.query(
      `INSERT INTO users (id, email, password_hash)
       VALUES ($1, 'immutability-user@example.test', 'test-hash')
       ON CONFLICT (id) DO NOTHING`,
      [userId],
    );
    await adminDatabase.query(
      `INSERT INTO organization_memberships (user_id, organization_id, role)
       VALUES ($1, $2, 'analyst')
       ON CONFLICT (user_id, organization_id) DO NOTHING`,
      [userId, organizationId],
    );
    const created = await database.withTransaction(organizationId, async (client) => {
      const investigation = await client.query<{ id: string }>(
        `INSERT INTO investigations
           (organization_id, requested_by, status, rule_set_version,
            evaluation_timestamp, input_fingerprint)
         VALUES ($1, $2, 'PARTIAL', 'test', NOW(), repeat('a', 64))
         RETURNING id`,
        [organizationId, userId],
      );
      const finding = await client.query<{ id: string }>(
        `INSERT INTO investigation_findings
           (organization_id, investigation_id, rule_id, rule_version,
            severity, status, explanation)
         VALUES ($1, $2, 'R999', 'test', 'LOW', 'NO_MATCH', 'test')
         RETURNING id`,
        [organizationId, investigation.rows[0]?.id],
      );
      const evidence = await client.query<{ id: string }>(
        `INSERT INTO investigation_evidence_references
           (organization_id, investigation_id, finding_id, source_type, source_id)
         VALUES ($1, $2, $3, 'payment', 'IMMUTABILITY')
         RETURNING id`,
        [organizationId, investigation.rows[0]?.id, finding.rows[0]?.id],
      );
      return {
        investigationId: investigation.rows[0]?.id,
        findingId: finding.rows[0]?.id,
        evidenceId: evidence.rows[0]?.id,
      };
    });

    for (const statement of [
      `UPDATE investigations SET status = 'COMPLETED' WHERE organization_id = $1 AND id = $2`,
      `DELETE FROM investigations WHERE organization_id = $1 AND id = $2`,
      `UPDATE investigation_findings SET explanation = 'changed' WHERE organization_id = $1 AND id = $2`,
      `DELETE FROM investigation_findings WHERE organization_id = $1 AND id = $2`,
      `UPDATE investigation_evidence_references SET field_name = 'changed' WHERE organization_id = $1 AND id = $2`,
      `DELETE FROM investigation_evidence_references WHERE organization_id = $1 AND id = $2`,
    ]) {
      await assert.rejects(
        () =>
          database.withTransaction(organizationId, async (client) => {
            const id =
              statement.includes('investigations ') && !statement.includes('investigation_')
                ? created.investigationId
                : statement.includes('findings')
                  ? created.findingId
                  : created.evidenceId;
            await client.query(statement, [organizationId, id]);
          }),
        /permission denied|row-level security|policy/,
      );
    }

    const concurrentCounts = await Promise.all(
      [organizationId, otherOrganizationId, organizationId, otherOrganizationId].map((tenantId) =>
        database.withTransaction(tenantId, async (client) => {
          const result = await client.query<{ tenant: string | null; count: string }>(
            `SELECT current_setting('app.organization_id', true) AS tenant,
                      COUNT(*)::text AS count
                 FROM organizations
                WHERE id = $1`,
            [tenantId],
          );
          return result.rows[0];
        }),
      ),
    );
    assert.deepEqual(
      concurrentCounts.map((row) => [row?.tenant, row?.count]),
      [
        [organizationId, '1'],
        [otherOrganizationId, '1'],
        [organizationId, '1'],
        [otherOrganizationId, '1'],
      ],
    );
  } finally {
    await adminDatabase.query(`DELETE FROM organizations WHERE id IN ($1, $2)`, [
      organizationId,
      otherOrganizationId,
    ]);
    await adminDatabase.query('DELETE FROM users WHERE id = $1', [userId]);
    await database.close();
    await adminDatabase.close();
  }
});
