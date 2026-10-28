import assert from 'node:assert/strict';
import test from 'node:test';
import type { PaymentRecord } from '../domain/payments.js';
import { PaymentStatusCache } from '../infrastructure/cache/payment-status-cache.js';
import { InMemoryPaymentRepository } from '../infrastructure/repositories/in-memory-payment-repository.js';
import { PaymentStatusService } from './payment-status-service.js';

const payment: PaymentRecord = {
  organizationId: 'org-fastmart',
  paymentId: 'PAY-10077',
  status: 'SUCCESS',
  amount: '1000.00',
  currency: 'INR',
  orderStatus: 'PAID',
  webhookProcessed: true,
  ledgerEntryPresent: true,
  updatedAt: '2026-10-28T00:00:00.000Z',
  version: 1,
};

void test('payment status is authoritative and makes zero AI invocations', async () => {
  const repository = new InMemoryPaymentRepository([payment]);
  const service = new PaymentStatusService(repository, new PaymentStatusCache(10, 30_000));

  const response = await service.getStatus(payment.organizationId, payment.paymentId);

  assert.equal(response.status, 'SUCCESS');
  assert.equal(response.orderStatus, 'PAID');
  assert.equal(response.aiInvocations, 0);
  assert.equal(response.source, 'database');
});

void test('repeated payment status requests reuse the authorized cache', async () => {
  const repository = new InMemoryPaymentRepository([payment]);
  const service = new PaymentStatusService(repository, new PaymentStatusCache(10, 30_000));

  await service.getStatus(payment.organizationId, payment.paymentId);
  const cached = await service.getStatus(payment.organizationId, payment.paymentId);

  assert.equal(cached.source, 'cache');
  assert.equal(cached.aiInvocations, 0);
});

void test('tenant-scoped keys prevent cross-tenant payment access', async () => {
  const otherTenantPayment = { ...payment, organizationId: 'org-quickeats' };
  const repository = new InMemoryPaymentRepository([payment, otherTenantPayment]);
  const service = new PaymentStatusService(repository, new PaymentStatusCache(10, 30_000));

  const response = await service.getStatus('org-quickeats', payment.paymentId);

  assert.equal(response.paymentId, payment.paymentId);
  assert.equal(response.source, 'database');
  assert.equal(response.status, 'SUCCESS');
});
