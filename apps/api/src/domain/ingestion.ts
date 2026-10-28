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
