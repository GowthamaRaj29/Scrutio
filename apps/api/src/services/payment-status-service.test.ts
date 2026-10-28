import assert from 'node:assert/strict';
import test from 'node:test';
import type { PaymentRecord, PaymentRepository } from '../domain/payments.js';
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

void test('expired entries are removed and force a fresh lookup', async () => {
  let now = 0;
  let lookups = 0;
  const repository = {
    findByOrganizationAndPaymentId: () => {
      lookups += 1;
      return Promise.resolve(payment);
    },
  } satisfies PaymentRepository;
  const service = new PaymentStatusService(repository, new PaymentStatusCache(10, 100, () => now));

  await service.getStatus(payment.organizationId, payment.paymentId);
  now = 101;
  await service.getStatus(payment.organizationId, payment.paymentId);

  assert.equal(lookups, 2);
});

void test('cache entry count stays bounded with least-recently-used eviction', async () => {
  const repository = new InMemoryPaymentRepository([
    payment,
    { ...payment, paymentId: 'PAY-SECOND' },
    { ...payment, paymentId: 'PAY-THIRD' },
  ]);
  const cache = new PaymentStatusCache(2, 30_000);
  const service = new PaymentStatusService(repository, cache);

  await service.getStatus(payment.organizationId, payment.paymentId);
  await service.getStatus(payment.organizationId, 'PAY-SECOND');
  await service.getStatus(payment.organizationId, payment.paymentId);
  await service.getStatus(payment.organizationId, 'PAY-THIRD');

  assert.equal(cache.size(), 2);
  assert.equal(
    (await service.getStatus(payment.organizationId, payment.paymentId)).source,
    'cache',
  );
});

void test('concurrent identical lookups use one tenant-scoped database request', async () => {
  let lookups = 0;
  let resolveLookup: ((value: PaymentRecord) => void) | undefined;
  const repository = {
    findByOrganizationAndPaymentId: () => {
      lookups += 1;
      return new Promise<PaymentRecord>((resolve) => {
        resolveLookup = resolve;
      });
    },
  } satisfies PaymentRepository;
  const service = new PaymentStatusService(repository, new PaymentStatusCache(10, 30_000));

  const first = service.getStatus(payment.organizationId, payment.paymentId);
  const second = service.getStatus(payment.organizationId, payment.paymentId);
  assert.equal(lookups, 1);
  assert.ok(resolveLookup);
  resolveLookup(payment);

  const responses = await Promise.all([first, second]);
  assert.equal(responses[0].status, 'SUCCESS');
  assert.equal(responses[1].status, 'SUCCESS');
});

void test('in-flight requests remain tenant-scoped', async () => {
  let lookups = 0;
  const repository = {
    findByOrganizationAndPaymentId: (
      organizationId: string,
      paymentId: string,
    ): Promise<PaymentRecord | null> => {
      lookups += 1;
      return Promise.resolve({ ...payment, organizationId, paymentId });
    },
  } satisfies PaymentRepository;
  const service = new PaymentStatusService(repository, new PaymentStatusCache(10, 30_000));

  const responses = await Promise.all([
    service.getStatus('org-one', payment.paymentId),
    service.getStatus('org-two', payment.paymentId),
  ]);

  assert.equal(lookups, 2);
  assert.equal(responses[0].source, 'database');
  assert.equal(responses[1].source, 'database');
});

void test('failed lookups are removed from single-flight and are not cached', async () => {
  let lookups = 0;
  const repository = {
    findByOrganizationAndPaymentId: (): Promise<PaymentRecord | null> => {
      lookups += 1;
      return Promise.resolve(null);
    },
  } satisfies PaymentRepository;
  const service = new PaymentStatusService(repository, new PaymentStatusCache(10, 30_000));

  await assert.rejects(service.getStatus(payment.organizationId, payment.paymentId));
  await assert.rejects(service.getStatus(payment.organizationId, payment.paymentId));

  assert.equal(lookups, 2);
});

void test('successful mutation invalidates cached state and stale reads cannot repopulate it', async () => {
  let resolveFirstLookup: ((value: PaymentRecord) => void) | undefined;
  const repository = {
    findByOrganizationAndPaymentId: (organizationId: string): Promise<PaymentRecord> => {
      if (resolveFirstLookup === undefined) {
        return new Promise<PaymentRecord>((resolve) => {
          resolveFirstLookup = resolve;
        });
      }
      return Promise.resolve({ ...payment, organizationId, status: 'REFUNDED', version: 2 });
    },
  } satisfies PaymentRepository;
  const service = new PaymentStatusService(repository, new PaymentStatusCache(10, 30_000));

  const staleRead = service.getStatus(payment.organizationId, payment.paymentId);
  service.invalidateAfterMutation(payment.organizationId, payment.paymentId);
  const freshRead = service.getStatus(payment.organizationId, payment.paymentId);
  assert.ok(resolveFirstLookup);
  resolveFirstLookup(payment);

  const freshResponse = await freshRead;
  await staleRead;
  const cachedResponse = await service.getStatus(payment.organizationId, payment.paymentId);
  assert.equal(freshResponse.status, 'REFUNDED');
  assert.equal(cachedResponse.status, 'REFUNDED');
  assert.equal(cachedResponse.source, 'cache');
});

void test('in-flight state is bounded under distinct-key overload', async () => {
  const repository = {
    findByOrganizationAndPaymentId: (
      organizationId: string,
      paymentId: string,
    ): Promise<PaymentRecord> => Promise.resolve({ ...payment, organizationId, paymentId }),
  } satisfies PaymentRepository;
  const service = new PaymentStatusService(repository, new PaymentStatusCache(10, 30_000), 1);

  const first = service.getStatus('org-one', 'PAY-1');
  const second = service.getStatus('org-one', 'PAY-2');
  assert.equal(service.inFlightSize(), 1);
  await Promise.all([first, second]);
});
