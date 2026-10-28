export const paymentStatuses = [
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
] as const;

export type PaymentStatus = (typeof paymentStatuses)[number];

export type PaymentRecord = {
  organizationId: string;
  paymentId: string;
  provider?: string | null;
  providerReferenceId?: string | null;
  status: PaymentStatus;
  amount: string;
  currency: string;
  orderStatus: string | null;
  webhookProcessed: boolean;
  ledgerEntryPresent: boolean;
  updatedAt: string;
  version: number;
};

export type PaymentStatusResponse = {
  paymentId: string;
  status: PaymentStatus;
  amount: string;
  currency: string;
  orderStatus: string | null;
  webhookProcessed: boolean;
  ledgerEntryPresent: boolean;
  updatedAt: string;
  source: 'database' | 'cache';
  aiInvocations: 0;
};

export interface PaymentRepository {
  findByOrganizationAndPaymentId(
    organizationId: string,
    paymentId: string,
  ): Promise<PaymentRecord | null>;
}

export function toPaymentStatusResponse(
  payment: PaymentRecord,
  source: PaymentStatusResponse['source'],
): PaymentStatusResponse {
  return {
    paymentId: payment.paymentId,
    status: payment.status,
    amount: payment.amount,
    currency: payment.currency,
    orderStatus: payment.orderStatus,
    webhookProcessed: payment.webhookProcessed,
    ledgerEntryPresent: payment.ledgerEntryPresent,
    updatedAt: payment.updatedAt,
    source,
    aiInvocations: 0,
  };
}
