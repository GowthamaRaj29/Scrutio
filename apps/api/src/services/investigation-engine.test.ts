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
  };
}

void test('SC-01 detects a successful payment with a pending order and no ledger', () => {
  const result = new InvestigationEngine().evaluate(evidence(), evaluatedAt);
  assert.deepEqual(
    result.findings.map((finding) => finding.ruleId),
    ['R001', 'R020', 'R021'],
  );
  assert.equal(result.findings[0]?.ruleVersion, '2026-10-28.v1');
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
