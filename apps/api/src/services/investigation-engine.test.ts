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

void test('threshold boundary is inclusive and below-threshold data does not match', () => {
  const atThreshold = new InvestigationEngine({
    pendingPaymentThresholdMinutes: 30,
    webhookUnprocessedThresholdMinutes: 5,
  }).evaluate(evidence({ status: 'PENDING', updatedAt: '2026-10-28T11:30:00.000Z' }), evaluatedAt);
  const belowThreshold = new InvestigationEngine({
    pendingPaymentThresholdMinutes: 30,
    webhookUnprocessedThresholdMinutes: 5,
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
