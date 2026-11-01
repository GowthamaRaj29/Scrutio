import assert from 'node:assert/strict';
import test from 'node:test';
import { InvestigationEngine, normalizeInvestigationEvidence } from './investigation-engine.js';
import type { InvestigationEvidence } from '../domain/investigations.js';

const evaluatedAt = '2026-10-28T12:00:00.000Z';

function evidence(
  overrides: Partial<InvestigationEvidence['payment']> = {},
): InvestigationEvidence {
  return {
    payment: {
      organizationId: '11111111-1111-4111-8111-111111111111',
      paymentId: 'PAY-10001',
      provider: null,
      providerReferenceId: null,
      status: 'SUCCESS',
      amount: '1000.00',
      currency: 'INR',
      orderStatus: 'PENDING',
      webhookProcessed: true,
      ledgerEntryPresent: false,
      updatedAt: '2026-10-28T11:00:00.000Z',
      version: 1,
      ...overrides,
    },
    order: {
      orderId: 'ORD-20001',
      status: 'PENDING',
      amount: '1000.00',
      currency: 'INR',
    },
    webhook: null,
    ledger: null,
    settlement: null,
    providerHistory: null,
    duplicateProviderPaymentIds: [],
    orderSuccessfulPaymentAmount: null,
    orderSuccessfulPaymentCount: null,
    postedPaymentCreditCount: null,
    paymentCreditCount: null,
    paymentCreditAmountMismatchCount: null,
    refundDebitExists: null,
    journalLineCount: null,
    journalDebitAmount: null,
    journalCreditAmount: null,
    settlementCount: 0,
    burstFailedPaymentCount: null,
    failureRateFailedPaymentCount: null,
    failureRateEligiblePaymentCount: null,
    webhookFailureCount: null,
  };
}

void test('SC-01 detects a successful payment with a pending order and no ledger', () => {
  const result = new InvestigationEngine().evaluate(evidence(), evaluatedAt);
  assert.deepEqual(
    result.findings.map((finding) => finding.ruleId),
    ['R001', 'R021'],
  );
  assert.equal(result.findings[0]?.ruleVersion, '2026-10-28.v1');
});

void test('POM rules honor exact amount tolerance and required states', () => {
  const engine = new InvestigationEngine();
  const order = { orderId: 'ORD-20001', status: 'PAID', amount: '1000.00', currency: 'INR' };

  const overOnePaise = engine.evaluate(
    { ...evidence(), order, payment: { ...evidence().payment, amount: '1000.01' } },
    evaluatedAt,
  );
  assert.equal(overOnePaise.evaluations.find((item) => item.ruleId === 'R006')?.status, 'NO_MATCH');

  const overTwoPaise = engine.evaluate(
    { ...evidence(), order, payment: { ...evidence().payment, amount: '1000.02' } },
    evaluatedAt,
  );
  assert.equal(overTwoPaise.evaluations.find((item) => item.ruleId === 'R006')?.status, 'MATCH');

  const underOnePaise = engine.evaluate(
    { ...evidence(), order, payment: { ...evidence().payment, amount: '999.99' } },
    evaluatedAt,
  );
  assert.equal(
    underOnePaise.evaluations.find((item) => item.ruleId === 'R007')?.status,
    'NO_MATCH',
  );

  const underTwoPaise = engine.evaluate(
    { ...evidence(), order, payment: { ...evidence().payment, amount: '999.98' } },
    evaluatedAt,
  );
  assert.equal(underTwoPaise.evaluations.find((item) => item.ruleId === 'R007')?.status, 'MATCH');

  const failedUnderpayment = engine.evaluate(
    {
      ...evidence({ status: 'FAILED' }),
      order,
      payment: { ...evidence({ status: 'FAILED' }).payment, amount: '900.00' },
    },
    evaluatedAt,
  );
  assert.equal(
    failedUnderpayment.evaluations.find((item) => item.ruleId === 'R007')?.status,
    'NO_MATCH',
  );

  const missingOrder = engine.evaluate({ ...evidence(), order: null }, evaluatedAt);
  assert.equal(
    missingOrder.evaluations.find((item) => item.ruleId === 'R006')?.status,
    'INSUFFICIENT_EVIDENCE',
  );
  assert.equal(
    missingOrder.evaluations.find((item) => item.ruleId === 'R007')?.status,
    'INSUFFICIENT_EVIDENCE',
  );
});

void test('POM, webhook, and settlement rules cover direct positive and negative states', () => {
  const engine = new InvestigationEngine();
  const paidOrder = {
    orderId: 'ORD-20001',
    status: 'PAID',
    amount: '1000.00',
    currency: 'INR',
  };
  const webhook = {
    eventId: 'WHK-DIRECT',
    paymentId: 'PAY-10001',
    signatureVerified: true,
    processingStatus: 'RECEIVED' as const,
    receivedAt: '2026-10-28T11:55:00.000Z',
  };
  const ledger = {
    entryId: '11111111-1111-4111-8111-111111111111',
    amount: '1000.00',
    currency: 'INR',
    status: 'POSTED' as const,
    createdAt: '2026-10-28T11:00:00.000Z',
  };
  const settled = {
    settlementId: 'STL-1',
    status: 'SETTLED' as const,
    amount: '1000.00',
    currency: 'INR',
    settledAt: '2026-10-28T12:00:00.000Z',
  };

  const contradictoryOrder = engine.evaluate(
    { ...evidence(), order: { ...paidOrder, status: 'PAYMENT_FAILED' } },
    evaluatedAt,
  );
  assert.equal(
    contradictoryOrder.evaluations.find((item) => item.ruleId === 'R002')?.status,
    'MATCH',
  );
  assert.equal(
    contradictoryOrder.evaluations.find((item) => item.ruleId === 'R003')?.status,
    'NO_MATCH',
  );

  const cancelledOrder = engine.evaluate(
    { ...evidence(), order: { ...paidOrder, status: 'CANCELLED' } },
    evaluatedAt,
  );
  assert.equal(cancelledOrder.evaluations.find((item) => item.ruleId === 'R003')?.status, 'MATCH');
  assert.equal(
    cancelledOrder.evaluations.find((item) => item.ruleId === 'R002')?.status,
    'NO_MATCH',
  );

  const currencyMismatch = engine.evaluate(
    { ...evidence(), order: { ...paidOrder, currency: 'USD' } },
    evaluatedAt,
  );
  assert.equal(
    currencyMismatch.evaluations.find((item) => item.ruleId === 'R008')?.status,
    'MATCH',
  );
  assert.equal(
    engine
      .evaluate({ ...evidence(), order: paidOrder }, evaluatedAt)
      .evaluations.find((item) => item.ruleId === 'R008')?.status,
    'NO_MATCH',
  );

  const delayedWebhook = engine.evaluate({ ...evidence(), webhook }, evaluatedAt);
  assert.equal(delayedWebhook.evaluations.find((item) => item.ruleId === 'R011')?.status, 'MATCH');
  assert.equal(
    engine
      .evaluate(
        { ...evidence(), webhook: { ...webhook, processingStatus: 'PROCESSED' } },
        evaluatedAt,
      )
      .evaluations.find((item) => item.ruleId === 'R011')?.status,
    'NO_MATCH',
  );

  const settledPending = engine.evaluate(
    { ...evidence({ status: 'PENDING' }), settlement: settled },
    evaluatedAt,
  );
  assert.equal(settledPending.evaluations.find((item) => item.ruleId === 'R033')?.status, 'MATCH');
  assert.equal(
    engine
      .evaluate({ ...evidence({ status: 'SUCCESS' }), settlement: settled }, evaluatedAt)
      .evaluations.find((item) => item.ruleId === 'R033')?.status,
    'NO_MATCH',
  );

  assert.equal(
    engine
      .evaluate({ ...evidence(), settlement: { ...settled, currency: 'USD' } }, evaluatedAt)
      .evaluations.find((item) => item.ruleId === 'R036')?.status,
    'MATCH',
  );
  assert.equal(
    engine
      .evaluate({ ...evidence(), settlement: settled }, evaluatedAt)
      .evaluations.find((item) => item.ruleId === 'R036')?.status,
    'NO_MATCH',
  );

  const downstreamPending = engine.evaluate(
    {
      ...evidence(),
      order: { ...paidOrder, status: 'PENDING' },
      webhook: { ...webhook, processingStatus: 'PROCESSED' },
      ledger,
    },
    evaluatedAt,
  );
  assert.equal(
    downstreamPending.evaluations.find((item) => item.ruleId === 'R042')?.status,
    'MATCH',
  );
  assert.equal(
    engine
      .evaluate(
        {
          ...evidence(),
          order: paidOrder,
          webhook: { ...webhook, processingStatus: 'PROCESSED' },
          ledger,
        },
        evaluatedAt,
      )
      .evaluations.find((item) => item.ruleId === 'R042')?.status,
    'NO_MATCH',
  );

  const preSettlementComplete = engine.evaluate(
    { ...evidence(), order: paidOrder, ledger },
    evaluatedAt,
  );
  assert.equal(
    preSettlementComplete.evaluations.find((item) => item.ruleId === 'R044')?.status,
    'MATCH',
  );
  assert.equal(
    engine
      .evaluate({ ...evidence(), order: paidOrder, ledger, settlement: settled }, evaluatedAt)
      .evaluations.find((item) => item.ruleId === 'R044')?.status,
    'NO_MATCH',
  );

  const missing = engine.evaluate({ ...evidence(), order: null }, evaluatedAt);
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
      missing.evaluations.find((item) => item.ruleId === ruleId)?.status,
      'INSUFFICIENT_EVIDENCE',
    );
  }
});

void test('R025 uses evaluation time and R026 distinguishes missing from balanced journals', () => {
  const engine = new InvestigationEngine();
  const pending = {
    ...evidence(),
    ledger: {
      entryId: '11111111-1111-4111-8111-111111111111',
      amount: '1000.00',
      currency: 'INR',
      status: 'PENDING' as const,
      createdAt: '2026-10-28T10:59:59.000Z',
    },
  };
  assert.equal(
    engine.evaluate(pending, evaluatedAt).evaluations.find((item) => item.ruleId === 'R025')
      ?.status,
    'MATCH',
  );
  const atBoundary = engine.evaluate(
    { ...pending, ledger: { ...pending.ledger, createdAt: '2026-10-28T11:00:00.000Z' } },
    evaluatedAt,
  );
  assert.equal(atBoundary.evaluations.find((item) => item.ruleId === 'R025')?.status, 'NO_MATCH');
  const balanced = engine.evaluate(
    {
      ...evidence(),
      ledger: {
        entryId: '11111111-1111-4111-8111-111111111111',
        amount: '100.00',
        currency: 'INR',
        status: 'POSTED',
        createdAt: '2026-10-28T11:00:00.000Z',
      },
      journalLineCount: 2,
      journalDebitAmount: '100.00',
      journalCreditAmount: '100.00',
    },
    evaluatedAt,
  );
  assert.equal(balanced.evaluations.find((item) => item.ruleId === 'R026')?.status, 'NO_MATCH');
  const imbalanced = engine.evaluate(
    {
      ...evidence(),
      ledger: {
        entryId: '11111111-1111-4111-8111-111111111111',
        amount: '100.00',
        currency: 'INR',
        status: 'POSTED',
        createdAt: '2026-10-28T11:00:00.000Z',
      },
      journalLineCount: 2,
      journalDebitAmount: '100.00',
      journalCreditAmount: '99.99',
    },
    evaluatedAt,
  );
  assert.equal(imbalanced.evaluations.find((item) => item.ruleId === 'R026')?.status, 'MATCH');
  const missing = engine.evaluate(evidence(), evaluatedAt);
  assert.equal(
    missing.evaluations.find((item) => item.ruleId === 'R025')?.status,
    'INSUFFICIENT_EVIDENCE',
  );
  assert.equal(
    missing.evaluations.find((item) => item.ruleId === 'R026')?.status,
    'INSUFFICIENT_EVIDENCE',
  );
});

void test('R039 requires an unprocessed webhook and preserves R021 independence', () => {
  const stalledEvidence = {
    ...evidence(),
    webhook: {
      eventId: 'WHK-STALL',
      paymentId: 'PAY-10001',
      signatureVerified: true,
      processingStatus: 'RECEIVED' as const,
      receivedAt: '2026-10-28T11:59:00.000Z',
    },
  };
  const withUnprocessedWebhook = new InvestigationEngine().evaluate(stalledEvidence, evaluatedAt);
  assert.equal(
    withUnprocessedWebhook.evaluations.find((item) => item.ruleId === 'R021')?.status,
    'MATCH',
  );
  const r039 = withUnprocessedWebhook.findings.find((finding) => finding.ruleId === 'R039');
  assert.ok(r039);
  assert.equal(r039.severity, 'CRITICAL');
  assert.deepEqual(r039.evidenceReferences, [
    'order.status',
    'payment.ledgerEntryPresent',
    'payment.status',
    'webhook.processingStatus',
  ]);
  const processed = new InvestigationEngine().evaluate(
    {
      ...stalledEvidence,
      webhook: { ...stalledEvidence.webhook, processingStatus: 'PROCESSED' },
    },
    evaluatedAt,
  );
  assert.equal(processed.evaluations.find((item) => item.ruleId === 'R039')?.status, 'NO_MATCH');
});

void test('R020 detects late webhook receipt after a settled settlement', () => {
  const result = new InvestigationEngine().evaluate(
    {
      ...evidence(),
      webhook: {
        eventId: 'WHK-LATE',
        paymentId: 'PAY-10001',
        signatureVerified: true,
        processingStatus: 'PROCESSED',
        receivedAt: '2026-10-28T12:05:00.000Z',
      },
      settlement: {
        settlementId: 'STL-1',
        status: 'SETTLED',
        amount: '1000.00',
        currency: 'INR',
        settledAt: '2026-10-28T12:00:00.000Z',
      },
    },
    evaluatedAt,
  );
  const finding = result.findings.find((item) => item.ruleId === 'R020');
  assert.ok(finding);
  assert.equal(finding.severity, 'INFO');
});

void test('R020 does not match an early or incomplete webhook settlement timeline', () => {
  const engine = new InvestigationEngine();
  const base = {
    ...evidence(),
    webhook: {
      eventId: 'WHK-EARLY',
      paymentId: 'PAY-10001',
      signatureVerified: true,
      processingStatus: 'PROCESSED' as const,
      receivedAt: '2026-10-28T11:55:00.000Z',
    },
    settlement: {
      settlementId: 'STL-1',
      status: 'SETTLED' as const,
      amount: '1000.00',
      currency: 'INR',
      settledAt: '2026-10-28T12:00:00.000Z',
    },
  };
  assert.equal(
    engine.evaluate(base, evaluatedAt).evaluations.find((item) => item.ruleId === 'R020')?.status,
    'NO_MATCH',
  );
  assert.equal(
    engine
      .evaluate({ ...base, settlement: null }, evaluatedAt)
      .evaluations.find((item) => item.ruleId === 'R020')?.status,
    'INSUFFICIENT_EVIDENCE',
  );
});

void test('R004 and R041 remain distinct findings for their shared state predicate', () => {
  const result = new InvestigationEngine().evaluate(
    {
      ...evidence({ status: 'FAILED' }),
      order: { orderId: 'ORD-20001', status: 'PAID', amount: '1000.00', currency: 'INR' },
    },
    evaluatedAt,
  );
  assert.equal(result.findings.find((item) => item.ruleId === 'R004')?.severity, 'CRITICAL');
  assert.equal(result.findings.find((item) => item.ruleId === 'R041')?.severity, 'CRITICAL');
  assert.notEqual(
    result.findings.find((item) => item.ruleId === 'R004')?.explanation,
    result.findings.find((item) => item.ruleId === 'R041')?.explanation,
  );
  const cancelled = new InvestigationEngine().evaluate(
    {
      ...evidence({ status: 'CANCELLED' }),
      order: { orderId: 'ORD-20001', status: 'PAID', amount: '1000.00', currency: 'INR' },
    },
    evaluatedAt,
  );
  assert.equal(
    cancelled.findings.some((item) => item.ruleId === 'R041'),
    false,
  );
  assert.equal(cancelled.findings.find((item) => item.ruleId === 'R004')?.severity, 'CRITICAL');
});

void test('evidence-query rules evaluate ledger, settlement, and downstream states', () => {
  const engine = new InvestigationEngine();
  const ledger = {
    entryId: '11111111-1111-4111-8111-111111111111',
    amount: '1000.00',
    currency: 'INR',
    status: 'POSTED' as const,
    createdAt: '2026-10-28T11:00:00.000Z',
  };
  const webhook = {
    eventId: 'WHK-DOWNSTREAM',
    paymentId: 'PAY-10001',
    signatureVerified: true,
    processingStatus: 'PROCESSED' as const,
    receivedAt: '2026-10-28T11:59:00.000Z',
  };
  const settled = {
    settlementId: 'STL-1',
    status: 'SETTLED' as const,
    amount: '1000.00',
    currency: 'INR',
    settledAt: '2026-10-28T12:00:00.000Z',
  };

  const r022 = engine.evaluate({ ...evidence({ status: 'FAILED' }), ledger }, evaluatedAt);
  assert.equal(r022.findings.find((item) => item.ruleId === 'R022')?.severity, 'CRITICAL');

  const r033 = engine.evaluate(
    { ...evidence({ status: 'PENDING' }), settlement: settled },
    evaluatedAt,
  );
  assert.equal(r033.findings.find((item) => item.ruleId === 'R033')?.severity, 'CRITICAL');

  const r035 = engine.evaluate(
    { ...evidence({ status: 'FAILED' }), settlement: settled },
    evaluatedAt,
  );
  assert.equal(r035.findings.find((item) => item.ruleId === 'R035')?.severity, 'CRITICAL');

  const r036 = engine.evaluate(
    {
      ...evidence(),
      settlement: { ...settled, currency: 'USD' },
    },
    evaluatedAt,
  );
  assert.equal(r036.findings.find((item) => item.ruleId === 'R036')?.severity, 'HIGH');

  const r042 = engine.evaluate(
    {
      ...evidence(),
      webhook,
      ledger,
      order: { orderId: 'ORD-20001', status: 'PENDING', amount: '1000.00', currency: 'INR' },
    },
    evaluatedAt,
  );
  assert.equal(r042.findings.find((item) => item.ruleId === 'R042')?.severity, 'HIGH');

  const r044 = engine.evaluate(
    {
      ...evidence(),
      ledger,
      order: { orderId: 'ORD-20001', status: 'PAID', amount: '1000.00', currency: 'INR' },
    },
    evaluatedAt,
  );
  assert.equal(r044.findings.find((item) => item.ruleId === 'R044')?.severity, 'HIGH');
  assert.deepEqual(r044.findings.find((item) => item.ruleId === 'R044')?.evidenceReferences, [
    'ledger.status',
    'order.status',
    'payment.status',
    'settlement.settlementId',
  ]);

  const missing = engine.evaluate(evidence({ status: 'FAILED' }), evaluatedAt);
  for (const ruleId of ['R022', 'R033', 'R035', 'R036', 'R042', 'R044']) {
    assert.equal(
      missing.evaluations.find((item) => item.ruleId === ruleId)?.status,
      'INSUFFICIENT_EVIDENCE',
    );
  }
});

void test('aggregate rules detect over-collection, duplicate payments, ledger postings, and settlements', () => {
  const aggregateEvidence = {
    ...evidence(),
    orderSuccessfulPaymentAmount: '2020.01',
    orderSuccessfulPaymentCount: 2,
    postedPaymentCreditCount: 2,
    settlementCount: 2,
  };
  const result = new InvestigationEngine().evaluate(aggregateEvidence, evaluatedAt);
  assert.deepEqual(
    result.findings
      .filter((finding) => ['R009', 'R010', 'R024', 'R037'].includes(finding.ruleId))
      .map((finding) => [finding.ruleId, finding.severity]),
    [
      ['R009', 'CRITICAL'],
      ['R010', 'CRITICAL'],
      ['R024', 'CRITICAL'],
      ['R037', 'CRITICAL'],
    ],
  );
  assert.deepEqual(
    result.findings.find((finding) => finding.ruleId === 'R009')?.evidenceReferences,
    ['order.amount', 'orderSuccessfulPaymentAmount'],
  );
});

void test('aggregate rules respect exact boundaries and missing aggregate evidence', () => {
  const atTolerance = new InvestigationEngine().evaluate(
    {
      ...evidence(),
      orderSuccessfulPaymentAmount: '1010.00',
      orderSuccessfulPaymentCount: 1,
      postedPaymentCreditCount: 1,
      settlementCount: 1,
    },
    evaluatedAt,
  );
  assert.equal(atTolerance.evaluations.find((item) => item.ruleId === 'R009')?.status, 'NO_MATCH');
  assert.equal(atTolerance.evaluations.find((item) => item.ruleId === 'R010')?.status, 'NO_MATCH');
  assert.equal(atTolerance.evaluations.find((item) => item.ruleId === 'R024')?.status, 'NO_MATCH');
  assert.equal(atTolerance.evaluations.find((item) => item.ruleId === 'R037')?.status, 'NO_MATCH');

  const missing = new InvestigationEngine().evaluate(evidence(), evaluatedAt);
  for (const ruleId of ['R009', 'R010', 'R024']) {
    assert.equal(
      missing.evaluations.find((item) => item.ruleId === ruleId)?.status,
      'INSUFFICIENT_EVIDENCE',
    );
  }
  assert.equal(missing.evaluations.find((item) => item.ruleId === 'R037')?.status, 'NO_MATCH');
});

void test('ledger classification rules use entry types and preserve independent predicates', () => {
  const engine = new InvestigationEngine();
  const matchingCredit = {
    entryId: '11111111-1111-4111-8111-111111111111',
    amount: '1000.00',
    currency: 'INR',
    status: 'POSTED' as const,
    createdAt: '2026-10-28T11:00:00.000Z',
  };
  const base = {
    ...evidence(),
    ledger: matchingCredit,
    paymentCreditCount: 1,
    paymentCreditAmountMismatchCount: 0,
    refundDebitExists: true,
  };
  assert.equal(
    engine.evaluate(base, evaluatedAt).evaluations.find((item) => item.ruleId === 'R023')?.status,
    'NO_MATCH',
  );
  assert.equal(
    engine.evaluate(base, evaluatedAt).evaluations.find((item) => item.ruleId === 'R029')?.status,
    'MATCH',
  );
  assert.equal(
    engine
      .evaluate({ ...base, payment: { ...base.payment, status: 'REFUNDED' } }, evaluatedAt)
      .evaluations.find((item) => item.ruleId === 'R029')?.status,
    'NO_MATCH',
  );
  assert.equal(
    engine
      .evaluate(
        { ...base, payment: { ...base.payment, status: 'PARTIALLY_REFUNDED' } },
        evaluatedAt,
      )
      .evaluations.find((item) => item.ruleId === 'R029')?.status,
    'NO_MATCH',
  );
  assert.equal(
    engine
      .evaluate({ ...base, payment: { ...base.payment, status: 'FAILED' } }, evaluatedAt)
      .evaluations.find((item) => item.ruleId === 'R043')?.status,
    'MATCH',
  );
  assert.equal(
    engine
      .evaluate({ ...base, payment: { ...base.payment, status: 'CANCELLED' } }, evaluatedAt)
      .evaluations.find((item) => item.ruleId === 'R043')?.status,
    'MATCH',
  );
  assert.equal(
    engine
      .evaluate({ ...base, payment: { ...base.payment, status: 'SUCCESS' } }, evaluatedAt)
      .evaluations.find((item) => item.ruleId === 'R043')?.status,
    'NO_MATCH',
  );
  const mismatch = engine.evaluate({ ...base, paymentCreditAmountMismatchCount: 1 }, evaluatedAt);
  assert.equal(mismatch.evaluations.find((item) => item.ruleId === 'R023')?.status, 'MATCH');
  assert.equal(mismatch.findings.find((item) => item.ruleId === 'R023')?.severity, 'CRITICAL');
  assert.equal(mismatch.findings.find((item) => item.ruleId === 'R029')?.severity, 'HIGH');
  assert.equal(
    mismatch.findings.find((item) => item.ruleId === 'R043'),
    undefined,
  );
  const missing = engine.evaluate(
    {
      ...evidence(),
      paymentCreditCount: null,
      paymentCreditAmountMismatchCount: null,
      refundDebitExists: null,
    },
    evaluatedAt,
  );
  for (const ruleId of ['R023', 'R029', 'R043']) {
    assert.equal(
      missing.evaluations.find((item) => item.ruleId === ruleId)?.status,
      'INSUFFICIENT_EVIDENCE',
    );
  }
});

void test('R052, R055, and R056 use strict configured thresholds', () => {
  const engine = new InvestigationEngine({
    pendingPaymentThresholdMinutes: 30,
    webhookUnprocessedThresholdMinutes: 5,
    burstFailureWindowHours: 1,
    burstFailureCountThreshold: 5,
    webhookStormWindowMinutes: 10,
    webhookStormCountThreshold: 12,
    failureRateThresholdPct: 50,
  });
  const above = engine.evaluate(
    {
      ...evidence(),
      burstFailedPaymentCount: 6,
      webhookFailureCount: 13,
      failureRateFailedPaymentCount: 6,
      failureRateEligiblePaymentCount: 10,
    },
    evaluatedAt,
  );
  assert.deepEqual(
    ['R052', 'R055', 'R056'].map(
      (ruleId) => above.evaluations.find((item) => item.ruleId === ruleId)?.status,
    ),
    ['MATCH', 'MATCH', 'MATCH'],
  );

  const atBoundary = engine.evaluate(
    {
      ...evidence(),
      burstFailedPaymentCount: 5,
      webhookFailureCount: 12,
      failureRateFailedPaymentCount: 5,
      failureRateEligiblePaymentCount: 10,
    },
    evaluatedAt,
  );
  assert.deepEqual(
    ['R052', 'R055', 'R056'].map(
      (ruleId) => atBoundary.evaluations.find((item) => item.ruleId === ruleId)?.status,
    ),
    ['NO_MATCH', 'NO_MATCH', 'NO_MATCH'],
  );

  const insufficient = engine.evaluate(evidence(), evaluatedAt);
  assert.deepEqual(
    ['R052', 'R055', 'R056'].map(
      (ruleId) => insufficient.evaluations.find((item) => item.ruleId === ruleId)?.status,
    ),
    ['INSUFFICIENT_EVIDENCE', 'INSUFFICIENT_EVIDENCE', 'INSUFFICIENT_EVIDENCE'],
  );
  const zeroEligible = engine.evaluate(
    { ...evidence(), failureRateFailedPaymentCount: 0, failureRateEligiblePaymentCount: 0 },
    evaluatedAt,
  );
  assert.equal(
    zeroEligible.evaluations.find((item) => item.ruleId === 'R056')?.status,
    'INSUFFICIENT_EVIDENCE',
  );
});

void test('threshold boundary is inclusive and below-threshold data does not match', () => {
  const atThreshold = new InvestigationEngine({
    pendingPaymentThresholdMinutes: 30,
    webhookUnprocessedThresholdMinutes: 5,
    burstFailureWindowHours: 1,
    burstFailureCountThreshold: 5,
    webhookStormWindowMinutes: 10,
    webhookStormCountThreshold: 12,
    failureRateThresholdPct: 50,
  }).evaluate(evidence({ status: 'PENDING', updatedAt: '2026-10-28T11:30:00.000Z' }), evaluatedAt);
  const belowThreshold = new InvestigationEngine({
    pendingPaymentThresholdMinutes: 30,
    webhookUnprocessedThresholdMinutes: 5,
    burstFailureWindowHours: 1,
    burstFailureCountThreshold: 5,
    webhookStormWindowMinutes: 10,
    webhookStormCountThreshold: 12,
    failureRateThresholdPct: 50,
  }).evaluate(evidence({ status: 'PENDING', updatedAt: '2026-10-28T11:30:01.000Z' }), evaluatedAt);
  assert.equal(atThreshold.evaluations.find((item) => item.ruleId === 'R005')?.status, 'MATCH');
  assert.equal(
    belowThreshold.evaluations.find((item) => item.ruleId === 'R005')?.status,
    'NO_MATCH',
  );
});

void test('missing order and webhook evidence is insufficient, not a false confirmation', () => {
  const result = new InvestigationEngine().evaluate({ ...evidence(), order: null }, evaluatedAt);
  assert.equal(
    result.evaluations.find((item) => item.ruleId === 'R001')?.status,
    'INSUFFICIENT_EVIDENCE',
  );
  assert.equal(
    result.evaluations.find((item) => item.ruleId === 'R011')?.status,
    'INSUFFICIENT_EVIDENCE',
  );
});

void test('webhook signature and processing mismatches are detected', () => {
  const result = new InvestigationEngine().evaluate(
    {
      ...evidence({ ledgerEntryPresent: true }),
      order: null,
      webhook: {
        eventId: 'WHK-1',
        paymentId: 'PAY-10001',
        signatureVerified: false,
        processingStatus: 'PROCESSED',
        receivedAt: '2026-10-28T11:59:00.000Z',
      },
    },
    evaluatedAt,
  );
  assert.equal(
    result.findings.some((finding) => finding.ruleId === 'R012'),
    true,
  );
});

void test('identical inputs produce stable, sorted results', () => {
  const engine = new InvestigationEngine();
  const first = engine.evaluate(evidence(), evaluatedAt);
  const second = engine.evaluate(evidence(), evaluatedAt);
  assert.deepEqual(first, second);
  assert.deepEqual(
    first.evaluations.map((evaluation) => evaluation.ruleId),
    [...first.evaluations.map((evaluation) => evaluation.ruleId)].sort(),
  );
});

void test('invalid amounts and timestamps are rejected at the boundary', () => {
  assert.throws(() => normalizeInvestigationEvidence(evidence({ amount: 'not-money' })));
  assert.throws(() =>
    normalizeInvestigationEvidence(evidence({ updatedAt: '2026-10-28 12:00:00' })),
  );
});

void test('R060 detects duplicate provider references with critical severity', () => {
  const result = new InvestigationEngine().evaluate(
    {
      ...evidence(),
      payment: {
        ...evidence().payment,
        provider: 'provider-a',
        providerReferenceId: 'REF-001',
      },
      duplicateProviderPaymentIds: ['PAY-10002'],
    },
    evaluatedAt,
  );
  const finding = result.findings.find((item) => item.ruleId === 'R060');
  assert.ok(finding);
  assert.equal(finding.severity, 'CRITICAL');
  assert.deepEqual(finding.evidenceReferences, [
    'payment.duplicate.PAY-10002',
    'payment.providerReferenceId',
  ]);
});

void test('R060 distinguishes missing and unique provider references', () => {
  const missing = new InvestigationEngine().evaluate(evidence(), evaluatedAt);
  assert.equal(
    missing.evaluations.find((item) => item.ruleId === 'R060')?.status,
    'INSUFFICIENT_EVIDENCE',
  );
  const unique = new InvestigationEngine().evaluate(
    {
      ...evidence(),
      payment: { ...evidence().payment, providerReferenceId: 'REF-UNIQUE' },
    },
    evaluatedAt,
  );
  assert.equal(unique.evaluations.find((item) => item.ruleId === 'R060')?.status, 'NO_MATCH');
});
