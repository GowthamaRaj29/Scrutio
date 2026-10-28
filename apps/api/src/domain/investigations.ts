import { z } from 'zod';

export const investigationPaymentSchema = z.object({
  organizationId: z.uuid(),
  paymentId: z.string().min(1).max(100),
  provider: z.string().min(1).max(100).nullable().default(null),
  providerReferenceId: z.string().min(1).max(255).nullable().default(null),
  status: z.enum([
    'INITIATED',
    'PENDING',
    'PROCESSING',
    'AUTHORIZED',
    'SUCCESS',
    'FAILED',
    'REFUNDED',
    'PARTIALLY_REFUNDED',
    'DISPUTED',
    'CANCELLED',
    'EXPIRED',
  ]),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().min(1).max(10),
  orderStatus: z.string().min(1).max(50).nullable(),
  webhookProcessed: z.boolean(),
  ledgerEntryPresent: z.boolean(),
  updatedAt: z.iso.datetime({ offset: true }),
  version: z.number().int().positive(),
});

export const investigationOrderSchema = z.object({
  orderId: z.string().min(1).max(100),
  status: z.string().min(1).max(50),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().min(1).max(10),
});

export const investigationWebhookSchema = z.object({
  eventId: z.string().min(1).max(100),
  paymentId: z.string().min(1).max(100).nullable(),
  signatureVerified: z.boolean(),
  processingStatus: z.enum(['RECEIVED', 'PROCESSED', 'FAILED']),
  receivedAt: z.iso.datetime({ offset: true }),
});

export const investigationEvidenceSchema = z.object({
  payment: investigationPaymentSchema,
  order: investigationOrderSchema.nullable().default(null),
  webhook: investigationWebhookSchema.nullable().default(null),
  ledger: z
    .object({
      entryId: z.uuid(),
      amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
      currency: z.string().min(1).max(10),
      status: z.enum(['PENDING', 'POSTED', 'REVERSED']),
    })
    .nullable()
    .default(null),
  settlement: z
    .object({
      settlementId: z.string().min(1).max(100),
      status: z.enum(['PENDING', 'SETTLED', 'FAILED']),
      amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
      currency: z.string().min(1).max(10),
    })
    .nullable()
    .default(null),
  providerHistory: z
    .object({
      provider: z.string().min(1).max(100),
      providerEventId: z.string().min(1).max(255),
      providerReferenceId: z.string().min(1).max(255).nullable(),
      observedStatus: z.string().min(1).max(50),
      observedAt: z.iso.datetime({ offset: true }),
    })
    .nullable()
    .default(null),
  duplicateProviderPaymentIds: z.array(z.string().min(1).max(100)).default([]),
});

export type InvestigationEvidence = z.infer<typeof investigationEvidenceSchema>;

export type InvestigationRuleStatus = 'MATCH' | 'NO_MATCH' | 'INSUFFICIENT_EVIDENCE';

export type InvestigationRuleEvaluation = {
  ruleId: string;
  version: string;
  status: InvestigationRuleStatus;
  explanation: string;
  evidenceReferences: string[];
};

export type InvestigationFinding = {
  ruleId: string;
  ruleVersion: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  explanation: string;
  evidenceReferences: string[];
};

export type InvestigationResult = {
  organizationId: string;
  paymentId: string;
  evaluatedAt: string;
  ruleSetVersion: string;
  evaluations: InvestigationRuleEvaluation[];
  findings: InvestigationFinding[];
};
