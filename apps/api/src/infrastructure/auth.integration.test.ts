import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { loadConfig } from '../config/index.js';
import { createApp } from '../app.js';
import { PaymentStatusCache } from './cache/payment-status-cache.js';
import { InvestigationService } from '../services/investigation-service.js';
import { AuthService, AuthenticationError, SessionError } from '../services/auth-service.js';
import { createPasswordHash } from '../services/auth-service.js';
import { runMigrations } from './migrations/run-migrations.js';
import { Database } from './postgres/database.js';

const config = loadConfig();

void test('PostgreSQL authentication sessions are tenant-scoped and revocable', async (context) => {
  if (config.databaseUrl === undefined) {
    context.skip('DATABASE_URL is not configured; run this test against real PostgreSQL');
    return;
  }
  const adminUrl = config.databaseAdminUrl ?? config.databaseUrl;
  await runMigrations(adminUrl);
  const adminDatabase = new Database(adminUrl);
  const appDatabase = new Database(config.databaseUrl);
  const organizationId = randomUUID();
  const otherOrganizationId = randomUUID();
  const userId = randomUUID();
  const email = `auth-${userId}@example.test`;
  const password = 'correct horse battery staple';
  try {
    const passwordHash = await createPasswordHash(password);
    await adminDatabase.query(
      `INSERT INTO organizations (id, slug, name)
       VALUES ($1, $2, 'Authentication Test Organization'), ($3, $4, 'Other Organization')`,
      [organizationId, `auth-${userId}`, otherOrganizationId, `other-${userId}`],
    );
    await adminDatabase.query(`INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)`, [
      userId,
      email,
      passwordHash,
    ]);
    await adminDatabase.query(
      `INSERT INTO organization_memberships (user_id, organization_id, role)
       VALUES ($1, $2, 'analyst')`,
      [userId, organizationId],
    );

    const authService = new AuthService(appDatabase);
    await assert.rejects(
      () => authService.login(email, 'incorrect password'),
      (error: unknown) => error instanceof AuthenticationError,
    );
    const login = await authService.login(email, password);
    assert.equal(login.user.organizationId, organizationId);
    assert.equal(login.user.role, 'analyst');
    assert.equal((await authService.currentUser(login.token)).userId, userId);
    const expiringLogin = await authService.login(email, password);
    await adminDatabase.query('UPDATE sessions SET expires_at = NOW() WHERE id = $1', [
      expiringLogin.user.sessionId,
    ]);
    await assert.rejects(
      () => authService.currentUser(expiringLogin.token),
      (error: unknown) => error instanceof SessionError,
    );

    await assert.rejects(
      () => authService.login(email, password, otherOrganizationId),
      (error: unknown) => error instanceof AuthenticationError,
    );
    await adminDatabase.query(
      `INSERT INTO payments
         (organization_id, payment_id, amount, status, order_status,
          webhook_processed, ledger_entry_present)
       VALUES ($1, 'AUTH-PAYMENT-001', 10.00, 'SUCCESS', 'PAID', true, true)`,
      [organizationId],
    );
    const app = createApp({
      paymentStatusCache: new PaymentStatusCache(10, 30_000),
      authService,
      database: appDatabase,
      investigationService: new InvestigationService(appDatabase),
    });
    const server = app.listen(0);
    try {
      const address = server.address();
      assert.notEqual(address, null);
      if (typeof address === 'string' || address === null) {
        throw new Error('Test server did not expose a TCP address');
      }
      const baseUrl = `http://127.0.0.1:${String(address.port)}`;
      const unauthenticatedInvestigation = await fetch(
        `${baseUrl}/api/v1/organizations/${organizationId}/investigations`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ paymentId: 'AUTH-PAYMENT-001' }),
        },
      );
      assert.equal(unauthenticatedInvestigation.status, 401);
      const loginResponse = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      assert.equal(loginResponse.status, 200);
      const cookie = loginResponse.headers.get('set-cookie')?.split(';')[0];
      assert.ok(cookie);

      const paymentResponse = await fetch(
        `${baseUrl}/api/v1/organizations/${organizationId}/payments/AUTH-PAYMENT-001/status`,
        { headers: { cookie } },
      );
      assert.equal(paymentResponse.status, 200);
      const overrideResponse = await fetch(
        `${baseUrl}/api/v1/organizations/${otherOrganizationId}/payments/AUTH-PAYMENT-001/status`,
        { headers: { cookie } },
      );
      assert.equal(overrideResponse.status, 403);

      const investigationResponse = await fetch(
        `${baseUrl}/api/v1/organizations/${organizationId}/investigations`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', cookie },
          body: JSON.stringify({
            paymentId: 'AUTH-PAYMENT-001',
            evaluationTimestamp: '2026-10-28T12:00:00.000Z',
          }),
        },
      );
      assert.equal(investigationResponse.status, 201);
      const investigation = (await investigationResponse.json()) as { id: string; status: string };
      assert.equal(investigation.status, 'PARTIAL');

      const retrievedInvestigation = await fetch(
        `${baseUrl}/api/v1/organizations/${organizationId}/investigations/${investigation.id}`,
        { headers: { cookie } },
      );
      assert.equal(retrievedInvestigation.status, 200);
      const crossTenantInvestigation = await fetch(
        `${baseUrl}/api/v1/organizations/${otherOrganizationId}/investigations/${investigation.id}`,
        { headers: { cookie } },
      );
      assert.equal(crossTenantInvestigation.status, 403);

      const logoutResponse = await fetch(`${baseUrl}/api/v1/auth/logout`, {
        method: 'POST',
        headers: { cookie },
      });
      assert.equal(logoutResponse.status, 204);
      const afterLogoutResponse = await fetch(
        `${baseUrl}/api/v1/organizations/${organizationId}/payments/AUTH-PAYMENT-001/status`,
        { headers: { cookie } },
      );
      assert.equal(afterLogoutResponse.status, 401);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error === undefined) {
            resolve();
          } else {
            reject(error);
          }
        });
      });
    }
    await authService.logout(login.token);
    await assert.rejects(
      () => authService.currentUser(login.token),
      (error: unknown) => error instanceof SessionError,
    );
  } finally {
    await adminDatabase.query('DELETE FROM investigations WHERE organization_id = $1', [
      organizationId,
    ]);
    await adminDatabase.query('DELETE FROM payments WHERE organization_id = $1', [organizationId]);
    await adminDatabase.query('DELETE FROM users WHERE id = $1', [userId]);
    await adminDatabase.query('DELETE FROM organizations WHERE id IN ($1, $2)', [
      organizationId,
      otherOrganizationId,
    ]);
    await appDatabase.close();
    await adminDatabase.close();
  }
});
