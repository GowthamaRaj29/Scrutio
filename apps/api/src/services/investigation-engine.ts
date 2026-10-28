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
        payment.status === 'FAILED' && order?.status === 'PAID'
          ? 'MATCH'
          : order === null
            ? 'INSUFFICIENT_EVIDENCE'
            : 'NO_MATCH',
        order === null
          ? 'Order evidence is unavailable; payment/order state cannot be compared.'
          : payment.status === 'FAILED' && order.status === 'PAID'
            ? 'Order is paid while the payment is failed.'
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
        payment.status === 'SUCCESS' && !payment.ledgerEntryPresent ? 'MATCH' : 'NO_MATCH',
        payment.status === 'SUCCESS' && !payment.ledgerEntryPresent
          ? 'Successful payment has no matching ledger entry.'
          : 'Payment ledger presence does not match the R020 condition.',
        ['payment.status', 'payment.ledgerEntryPresent'],
      ),
      evaluateRule(
        'R021',
        payment.status === 'SUCCESS' && order?.status === 'PENDING' && !payment.ledgerEntryPresent
          ? 'MATCH'
          : order === null
            ? 'INSUFFICIENT_EVIDENCE'
            : 'NO_MATCH',
        order === null
          ? 'Order evidence is unavailable; full payment pipeline stall cannot be evaluated.'
          : payment.status === 'SUCCESS' &&
              order.status === 'PENDING' &&
              !payment.ledgerEntryPresent
            ? 'Successful payment is pending at the order and has no ledger entry.'
            : 'Payment pipeline stall condition is not present.',
        ['payment.status', 'payment.ledgerEntryPresent', 'order.status'],
      ),
    );
    return evaluations.sort((left, right) => left.ruleId.localeCompare(right.ruleId));
  }

  private toFinding(evaluation: InvestigationRuleEvaluation): InvestigationFinding {
    const criticalRules = new Set(['R012', 'R021']);
    const highRules = new Set(['R001', 'R002', 'R003', 'R004', 'R020']);
    return {
      ruleId: evaluation.ruleId,
      ruleVersion: evaluation.version,
      severity: criticalRules.has(evaluation.ruleId)
        ? 'CRITICAL'
        : highRules.has(evaluation.ruleId)
          ? 'HIGH'
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
