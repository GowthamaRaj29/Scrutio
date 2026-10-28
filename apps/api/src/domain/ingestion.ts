import { z } from 'zod';

export const orderIngestionSchema = z.object({
  orderId: z.string().min(1).max(100),
  paymentId: z.string().min(1).max(100).optional(),
  status: z.enum(['PENDING', 'PAID', 'PAYMENT_FAILED', 'CANCELLED', 'FULFILLING', 'FULFILLED']),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().min(1).max(10),
  updatedAt: z.iso.datetime({ offset: true }).optional(),
});

export const webhookIngestionSchema = z.object({
  eventId: z.string().min(1).max(150),
  paymentId: z.string().min(1).max(100),
  eventType: z.string().min(1).max(100),
  signatureVerified: z.boolean(),
  processingStatus: z.enum(['RECEIVED', 'PROCESSED', 'FAILED']),
  receivedAt: z.iso.datetime({ offset: true }),
  processedAt: z.iso.datetime({ offset: true }).nullable().optional(),
});

export type OrderIngestion = z.infer<typeof orderIngestionSchema>;
export type WebhookIngestion = z.infer<typeof webhookIngestionSchema>;

export const ledgerEntryIngestionSchema = z.object({
  sourceEventId: z.string().min(1).max(150),
  paymentId: z.string().min(1).max(100).optional(),
  accountId: z.uuid(),
  entryType: z.string().min(1).max(50),
  status: z.enum(['PENDING', 'POSTED', 'REVERSED']),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().min(1).max(10),
  postedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  lines: z
    .array(
      z.object({
        direction: z.enum(['DEBIT', 'CREDIT']),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
        currency: z.string().min(1).max(10),
      }),
    )
    .min(2)
    .max(100),
});

export type LedgerEntryIngestion = z.infer<typeof ledgerEntryIngestionSchema>;

export const settlementIngestionSchema = z.object({
  sourceEventId: z.string().min(1).max(150),
  settlementId: z.string().min(1).max(100),
  status: z.enum(['PENDING', 'SETTLED', 'FAILED']),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().min(1).max(10),
  settlementDate: z.iso.date(),
  settledAt: z.iso.datetime({ offset: true }).nullable().optional(),
  utrNumber: z.string().min(1).max(150).nullable().optional(),
  paymentIds: z.array(z.string().min(1).max(100)).max(100),
});

export type SettlementIngestion = z.infer<typeof settlementIngestionSchema>;

export const providerPaymentEventIngestionSchema = z.object({
  provider: z.string().min(1).max(100),
  providerEventId: z.string().min(1).max(255),
  paymentId: z.string().min(1).max(100),
  providerReferenceId: z.string().min(1).max(255).nullable().optional(),
  observedStatus: z.string().min(1).max(50),
  observedAt: z.iso.datetime({ offset: true }),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .nullable()
    .optional(),
  currency: z.string().min(1).max(10).nullable().optional(),
});

export type ProviderPaymentEventIngestion = z.infer<typeof providerPaymentEventIngestionSchema>;

export const paymentProviderReferenceIngestionSchema = z.object({
  provider: z.string().min(1).max(100),
  providerReferenceId: z.string().min(1).max(255),
});

export type PaymentProviderReferenceIngestion = z.infer<
  typeof paymentProviderReferenceIngestionSchema
>;
