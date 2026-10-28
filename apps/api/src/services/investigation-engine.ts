import {
  investigationEvidenceSchema,
  type InvestigationEvidence,
  type InvestigationFinding,
  type InvestigationResult,
  type InvestigationRuleEvaluation,
} from '../domain/investigations.js';
import { loadConfig } from '../config/index.js';

export type InvestigationRuleConfig = {
  pendingPaymentThresholdMinutes: number;
  webhookUnprocessedThresholdMinutes: number;
};

const applicationConfig = loadConfig();
export const defaultInvestigationRuleConfig: InvestigationRuleConfig = {
  pendingPaymentThresholdMinutes: applicationConfig.incidentPendingPaymentThresholdMinutes,
  webhookUnprocessedThresholdMinutes: applicationConfig.incidentWebhookUnprocessedThresholdMinutes,
};

const RULE_SET_VERSION = '2026-10-28.v1';

function minutesSince(timestamp: string, evaluatedAt: string): number {
  return Math.max(0, (Date.parse(evaluatedAt) - Date.parse(timestamp)) / 60_000);
}

function moneyEquals(left: string, right: string): boolean {
  return Number(left) === Number(right);
}

function moneyToCents(value: string): bigint {
  const [whole = '0', fraction = ''] = value.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}

function exceedsOnePercent(total: string, orderAmount: string): boolean {
  return moneyToCents(total) * 100n > moneyToCents(orderAmount) * 101n;
}

function timestampOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function evaluateRule(
  ruleId: string,
  status: InvestigationRuleEvaluation['status'],
  explanation: string,
  evidenceReferences: string[],
): InvestigationRuleEvaluation {
  return {
    ruleId,
    version: RULE_SET_VERSION,
    status,
    explanation,
    evidenceReferences: [...evidenceReferences].sort(),
  };
}

export class InvestigationEngine {
  public constructor(
    private readonly ruleConfig: InvestigationRuleConfig = defaultInvestigationRuleConfig,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  public evaluate(input: unknown, evaluatedAt = this.clock().toISOString()): InvestigationResult {
    const evidence = investigationEvidenceSchema.parse(input);
    const evaluations = this.evaluateRules(evidence, evaluatedAt);
    const findings = evaluations
      .filter((evaluation) => evaluation.status === 'MATCH')
      .map((evaluation) => this.toFinding(evaluation));
    return {
      organizationId: evidence.payment.organizationId,
      paymentId: evidence.payment.paymentId,
      evaluatedAt,
      ruleSetVersion: RULE_SET_VERSION,
      evaluations,
      findings,
    };
  }

  private evaluateRules(
    evidence: InvestigationEvidence,
    evaluatedAt: string,
  ): InvestigationRuleEvaluation[] {
    const { payment, order, webhook } = evidence;
    const successfulPaymentAmount = evidence.orderSuccessfulPaymentAmount;
    const successfulPaymentCount = evidence.orderSuccessfulPaymentCount;
    const postedPaymentCreditCount = evidence.postedPaymentCreditCount;
    const settlementTimestamp = timestampOrNull(evidence.settlement?.settledAt);
    const lateSettlementWebhook =
      webhook !== null &&
      settlementTimestamp !== null &&
      evidence.settlement !== null &&
      evidence.settlement.status === 'SETTLED' &&
      Date.parse(webhook.receivedAt) > Date.parse(settlementTimestamp);
    const evaluations: InvestigationRuleEvaluation[] = [];

    evaluations.push(
      evaluateRule(
        'R001',
        payment.status === 'SUCCESS' && order?.status === 'PENDING'
          ? 'MATCH'
          : order === null
            ? 'INSUFFICIENT_EVIDENCE'
            : 'NO_MATCH',
        order === null
          ? 'Order evidence is unavailable; payment/order state cannot be compared.'
          : payment.status === 'SUCCESS' && order.status === 'PENDING'
            ? 'Payment is successful while the associated order remains pending.'
            : 'Payment and order state do not match the R001 condition.',
        ['payment.status', 'order.status'],
      ),
      evaluateRule(
        'R002',
        payment.status === 'SUCCESS' && order?.status === 'PAYMENT_FAILED'
          ? 'MATCH'
          : order === null
            ? 'INSUFFICIENT_EVIDENCE'
            : 'NO_MATCH',
        order === null
          ? 'Order evidence is unavailable; payment/order state cannot be compared.'
          : payment.status === 'SUCCESS' && order.status === 'PAYMENT_FAILED'
            ? 'Payment is successful while the associated order reports payment failure.'
            : 'Payment and order state do not match the R002 condition.',
        ['payment.status', 'order.status'],
      ),
      evaluateRule(
        'R003',
        payment.status === 'SUCCESS' && order?.status === 'CANCELLED'
          ? 'MATCH'
          : order === null
            ? 'INSUFFICIENT_EVIDENCE'
            : 'NO_MATCH',
        order === null
          ? 'Order evidence is unavailable; cancellation cannot be evaluated.'
          : payment.status === 'SUCCESS' && order.status === 'CANCELLED'
            ? 'Payment is successful for an order that is cancelled.'
            : 'Payment and order state do not match the R003 condition.',
        ['payment.status', 'order.status'],
      ),
      evaluateRule(
        'R004',
        (payment.status === 'FAILED' || payment.status === 'CANCELLED') && order?.status === 'PAID'
          ? 'MATCH'
          : order === null
            ? 'INSUFFICIENT_EVIDENCE'
            : 'NO_MATCH',
        order === null
          ? 'Order evidence is unavailable; payment/order state cannot be compared.'
          : (payment.status === 'FAILED' || payment.status === 'CANCELLED') &&
              order.status === 'PAID'
            ? 'Order is paid while the payment is failed or cancelled.'
            : 'Payment and order state do not match the R004 condition.',
        ['payment.status', 'order.status'],
      ),
      evaluateRule(
        'R005',
        payment.status === 'PENDING' &&
          minutesSince(payment.updatedAt, evaluatedAt) >=
            this.ruleConfig.pendingPaymentThresholdMinutes
          ? 'MATCH'
          : 'NO_MATCH',
        payment.status === 'PENDING'
          ? `Pending payment age is ${String(Math.round(minutesSince(payment.updatedAt, evaluatedAt)))} minutes; threshold is ${String(this.ruleConfig.pendingPaymentThresholdMinutes)} minutes.`
          : 'Payment is not pending.',
        ['payment.status', 'payment.updatedAt'],
      ),
      evaluateRule(
        'R006',
        order === null
          ? 'INSUFFICIENT_EVIDENCE'
          : Number(payment.amount) > Number(order.amount)
            ? 'MATCH'
            : 'NO_MATCH',
        order === null
          ? 'Order evidence is unavailable; payment and order amounts cannot be compared.'
          : Number(payment.amount) > Number(order.amount)
            ? 'Payment amount exceeds the order amount.'
            : 'Payment amount does not exceed the order amount.',
        ['payment.amount', 'order.amount'],
      ),
      evaluateRule(
        'R007',
        order === null
          ? 'INSUFFICIENT_EVIDENCE'
          : Number(payment.amount) < Number(order.amount)
            ? 'MATCH'
            : 'NO_MATCH',
        order === null
          ? 'Order evidence is unavailable; payment and order amounts cannot be compared.'
          : Number(payment.amount) < Number(order.amount)
            ? 'Payment amount is below the order amount.'
            : 'Payment amount is not below the order amount.',
        ['payment.amount', 'order.amount'],
      ),
      evaluateRule(
        'R008',
        order === null
          ? 'INSUFFICIENT_EVIDENCE'
          : payment.currency !== order.currency
            ? 'MATCH'
            : 'NO_MATCH',
        order === null
          ? 'Order evidence is unavailable; currencies cannot be compared.'
          : payment.currency !== order.currency
            ? 'Payment and order currencies differ.'
            : 'Payment and order currencies match.',
        ['payment.currency', 'order.currency'],
      ),
      evaluateRule(
        'R011',
        webhook === null
          ? 'INSUFFICIENT_EVIDENCE'
          : webhook.signatureVerified &&
              webhook.processingStatus !== 'PROCESSED' &&
              minutesSince(webhook.receivedAt, evaluatedAt) >=
                this.ruleConfig.webhookUnprocessedThresholdMinutes
            ? 'MATCH'
            : 'NO_MATCH',
        webhook === null
          ? 'Webhook evidence is unavailable.'
          : webhook.signatureVerified &&
              webhook.processingStatus !== 'PROCESSED' &&
              minutesSince(webhook.receivedAt, evaluatedAt) >=
                this.ruleConfig.webhookUnprocessedThresholdMinutes
            ? 'Verified webhook has remained unprocessed beyond the configured threshold.'
            : 'Webhook does not match the unprocessed threshold condition.',
        ['webhook.signatureVerified', 'webhook.processingStatus', 'webhook.receivedAt'],
      ),
      evaluateRule(
        'R012',
        webhook === null
          ? 'INSUFFICIENT_EVIDENCE'
          : !webhook.signatureVerified && webhook.processingStatus === 'PROCESSED'
            ? 'MATCH'
            : 'NO_MATCH',
        webhook === null
          ? 'Webhook evidence is unavailable.'
          : !webhook.signatureVerified && webhook.processingStatus === 'PROCESSED'
            ? 'Webhook was processed even though its signature was not verified.'
            : 'Webhook does not match the unverified-processed condition.',
        ['webhook.signatureVerified', 'webhook.processingStatus'],
      ),
      evaluateRule(
        'R020',
        webhook === null || evidence.settlement === null || settlementTimestamp === null
          ? 'INSUFFICIENT_EVIDENCE'
          : lateSettlementWebhook
            ? 'MATCH'
            : 'NO_MATCH',
        webhook === null || evidence.settlement === null || settlementTimestamp === null
          ? 'Webhook or settled-settlement timing evidence is unavailable.'
          : lateSettlementWebhook
            ? 'Webhook was received after the payment settlement was marked settled.'
            : 'Webhook receipt did not occur after a settled settlement.',
        ['webhook.receivedAt', 'settlement.settledAt', 'settlement.status'],
      ),
      evaluateRule(
        'R021',
        payment.status === 'SUCCESS' && !payment.ledgerEntryPresent ? 'MATCH' : 'NO_MATCH',
        payment.status === 'SUCCESS' && !payment.ledgerEntryPresent
          ? 'Successful payment has no matching ledger entry.'
          : 'Payment ledger presence does not match the R021 condition.',
        ['payment.status', 'payment.ledgerEntryPresent'],
      ),
      evaluateRule(
        'R009',
        order === null || successfulPaymentAmount === null || successfulPaymentCount === null
          ? 'INSUFFICIENT_EVIDENCE'
          : exceedsOnePercent(successfulPaymentAmount, order.amount)
            ? 'MATCH'
            : 'NO_MATCH',
        order === null || successfulPaymentAmount === null || successfulPaymentCount === null
          ? 'Order payment aggregate evidence is unavailable; over-collection cannot be evaluated.'
          : exceedsOnePercent(successfulPaymentAmount, order.amount)
            ? 'Successful payments for the order exceed the order amount by more than one percent.'
            : 'Successful payment total does not exceed the order amount tolerance.',
        ['order.amount', 'orderSuccessfulPaymentAmount'],
      ),
      evaluateRule(
        'R010',
        order === null || successfulPaymentCount === null
          ? 'INSUFFICIENT_EVIDENCE'
          : successfulPaymentCount > 1
            ? 'MATCH'
            : 'NO_MATCH',
        order === null || successfulPaymentCount === null
          ? 'Order payment count evidence is unavailable; duplicate successful payments cannot be evaluated.'
          : successfulPaymentCount > 1
            ? 'Multiple successful payments are associated with the same order.'
            : 'The order has at most one successful payment.',
        ['order.orderId', 'orderSuccessfulPaymentCount'],
      ),
      evaluateRule(
        'R022',
        evidence.ledger === null
          ? 'INSUFFICIENT_EVIDENCE'
          : evidence.ledger.status === 'POSTED' &&
              ['FAILED', 'CANCELLED', 'EXPIRED'].includes(payment.status)
            ? 'MATCH'
            : 'NO_MATCH',
        evidence.ledger === null
          ? 'Ledger evidence is unavailable; a posted entry for a failed payment cannot be evaluated.'
          : evidence.ledger.status === 'POSTED' &&
              ['FAILED', 'CANCELLED', 'EXPIRED'].includes(payment.status)
            ? 'A posted ledger entry exists for a failed, cancelled, or expired payment.'
            : 'Payment and ledger state do not match the R022 condition.',
        ['ledger.status', 'payment.status'],
      ),
      evaluateRule(
        'R024',
        postedPaymentCreditCount === null
          ? 'INSUFFICIENT_EVIDENCE'
          : postedPaymentCreditCount > 1
            ? 'MATCH'
            : 'NO_MATCH',
        postedPaymentCreditCount === null
          ? 'Posted payment-credit aggregate evidence is unavailable; duplicate ledger postings cannot be evaluated.'
          : postedPaymentCreditCount > 1
            ? 'Multiple posted payment-credit ledger entries exist for the payment.'
            : 'The payment has at most one posted payment-credit ledger entry.',
        ['payment.paymentId', 'postedPaymentCreditCount'],
      ),
      evaluateRule(
        'R033',
        evidence.settlement === null
          ? 'INSUFFICIENT_EVIDENCE'
          : evidence.settlement.status === 'SETTLED' && payment.status === 'PENDING'
            ? 'MATCH'
            : 'NO_MATCH',
        evidence.settlement === null
          ? 'Settlement evidence is unavailable; settlement/payment state cannot be compared.'
          : evidence.settlement.status === 'SETTLED' && payment.status === 'PENDING'
            ? 'A settled settlement references a payment that remains pending.'
            : 'Settlement and payment state do not match the R033 condition.',
        ['payment.status', 'settlement.status'],
      ),
      evaluateRule(
        'R035',
        evidence.settlement === null
          ? 'INSUFFICIENT_EVIDENCE'
          : payment.status === 'FAILED'
            ? 'MATCH'
            : 'NO_MATCH',
        evidence.settlement === null
          ? 'Settlement evidence is unavailable; failed-payment settlement inclusion cannot be evaluated.'
          : payment.status === 'FAILED'
            ? 'A failed payment is included in a settlement.'
            : 'Settlement and payment state do not match the R035 condition.',
        ['payment.status', 'settlement.status'],
      ),
      evaluateRule(
        'R036',
        evidence.settlement === null
          ? 'INSUFFICIENT_EVIDENCE'
          : evidence.settlement.currency !== payment.currency
            ? 'MATCH'
            : 'NO_MATCH',
        evidence.settlement === null
          ? 'Settlement evidence is unavailable; settlement/payment currency cannot be compared.'
          : evidence.settlement.currency !== payment.currency
            ? 'Settlement currency does not match the payment currency.'
            : 'Settlement and payment currencies match.',
        ['payment.currency', 'settlement.currency'],
      ),
      evaluateRule(
        'R037',
        evidence.settlementCount > 1 ? 'MATCH' : 'NO_MATCH',
        evidence.settlementCount > 1
          ? 'The payment appears in multiple settlements.'
          : 'The payment appears in at most one settlement.',
        ['payment.paymentId', 'settlementCount'],
      ),
      evaluateRule(
        'R039',
        webhook === null
          ? 'INSUFFICIENT_EVIDENCE'
          : payment.status === 'SUCCESS' &&
              order?.status === 'PENDING' &&
              webhook.processingStatus !== 'PROCESSED' &&
              !payment.ledgerEntryPresent
            ? 'MATCH'
            : order === null
              ? 'INSUFFICIENT_EVIDENCE'
              : 'NO_MATCH',
        webhook === null || order === null
          ? 'Order or webhook evidence is unavailable; full pipeline stall cannot be evaluated.'
          : payment.status === 'SUCCESS' &&
              order.status === 'PENDING' &&
              webhook.processingStatus !== 'PROCESSED' &&
              !payment.ledgerEntryPresent
            ? 'Successful payment has a pending order, an unprocessed webhook, and no ledger entry.'
            : 'Full pipeline stall condition is not present.',
        [
          'payment.status',
          'order.status',
          'webhook.processingStatus',
          'payment.ledgerEntryPresent',
        ],
      ),
      evaluateRule(
        'R042',
        order === null || webhook === null || evidence.ledger === null
          ? 'INSUFFICIENT_EVIDENCE'
          : payment.status === 'SUCCESS' &&
              webhook.processingStatus === 'PROCESSED' &&
              evidence.ledger.status === 'POSTED' &&
              order.status === 'PENDING'
            ? 'MATCH'
            : 'NO_MATCH',
        order === null || webhook === null || evidence.ledger === null
          ? 'Order, webhook, or ledger evidence is unavailable; downstream processing cannot be evaluated.'
          : payment.status === 'SUCCESS' &&
              webhook.processingStatus === 'PROCESSED' &&
              evidence.ledger.status === 'POSTED' &&
              order.status === 'PENDING'
            ? 'Payment, webhook, and ledger processing completed while the order remains pending.'
            : 'Payment, webhook, ledger, and order state do not match the R042 condition.',
        ['ledger.status', 'order.status', 'payment.status', 'webhook.processingStatus'],
      ),
      evaluateRule(
        'R044',
        order === null || evidence.ledger === null
          ? 'INSUFFICIENT_EVIDENCE'
          : payment.status === 'SUCCESS' &&
              evidence.ledger.status === 'POSTED' &&
              order.status === 'PAID' &&
              evidence.settlement === null
            ? 'MATCH'
            : 'NO_MATCH',
        order === null || evidence.ledger === null
          ? 'Order or ledger evidence is unavailable; pre-settlement completion cannot be evaluated.'
          : payment.status === 'SUCCESS' &&
              evidence.ledger.status === 'POSTED' &&
              order.status === 'PAID' &&
              evidence.settlement === null
            ? 'Payment, ledger, and order processing completed but no settlement exists.'
            : 'Payment, ledger, order, and settlement state do not match the R044 condition.',
        ['ledger.status', 'order.status', 'payment.status', 'settlement.settlementId'],
      ),
      evaluateRule(
        'R041',
        payment.status === 'FAILED'
          ? order === null
            ? 'INSUFFICIENT_EVIDENCE'
            : order.status === 'PAID'
              ? 'MATCH'
              : 'NO_MATCH'
          : 'NO_MATCH',
        order === null
          ? 'Order evidence is unavailable; impossible paid-order state cannot be evaluated.'
          : payment.status === 'FAILED' && order.status === 'PAID'
            ? 'Order is marked paid while the payment is failed.'
            : 'Payment and order state do not match the R041 condition.',
        ['payment.status', 'order.status'],
      ),
      evaluateRule(
        'R060',
        payment.providerReferenceId === null
          ? 'INSUFFICIENT_EVIDENCE'
          : evidence.duplicateProviderPaymentIds.length > 0
            ? 'MATCH'
            : 'NO_MATCH',
        payment.providerReferenceId === null
          ? 'Provider reference evidence is unavailable; duplicate provider references cannot be evaluated.'
          : evidence.duplicateProviderPaymentIds.length > 0
            ? `Provider reference ${payment.providerReferenceId} is used by multiple payment records in this organization.`
            : 'Provider reference is unique within this organization.',
        [
          'payment.providerReferenceId',
          ...evidence.duplicateProviderPaymentIds.map((id) => `payment.duplicate.${id}`),
        ],
      ),
    );
    return evaluations.sort((left, right) => left.ruleId.localeCompare(right.ruleId));
  }

  private toFinding(evaluation: InvestigationRuleEvaluation): InvestigationFinding {
    const criticalRules = new Set([
      'R004',
      'R009',
      'R010',
      'R012',
      'R021',
      'R022',
      'R024',
      'R033',
      'R035',
      'R037',
      'R039',
      'R041',
      'R060',
    ]);
    const highRules = new Set(['R001', 'R002', 'R003', 'R036', 'R042', 'R044']);
    return {
      ruleId: evaluation.ruleId,
      ruleVersion: evaluation.version,
      severity: criticalRules.has(evaluation.ruleId)
        ? 'CRITICAL'
        : highRules.has(evaluation.ruleId)
          ? 'HIGH'
          : evaluation.ruleId === 'R020'
            ? 'INFO'
            : 'MEDIUM',
      explanation: evaluation.explanation,
      evidenceReferences: evaluation.evidenceReferences,
    };
  }
}

export function normalizeInvestigationEvidence(input: unknown): InvestigationEvidence {
  return investigationEvidenceSchema.parse(input);
}

export function amountsMatch(left: string, right: string): boolean {
  return moneyEquals(left, right);
}
