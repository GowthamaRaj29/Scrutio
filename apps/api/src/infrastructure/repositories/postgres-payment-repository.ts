import type { Queryable } from '../postgres/database.js';
import type { PaymentRecord, PaymentRepository } from '../../domain/payments.js';

type PaymentRow = {
  organization_id: string;
  payment_id: string;
  provider: string | null;
  provider_reference_id: string | null;
  status: PaymentRecord['status'];
  amount: string;
  currency: string;
  order_status: string | null;
  webhook_processed: boolean;
  ledger_entry_present: boolean;
  updated_at: Date;
  version: number;
};

export class PostgresPaymentRepository implements PaymentRepository {
  public constructor(private readonly database: Queryable) {}

  public async findByOrganizationAndPaymentId(
    organizationId: string,
    paymentId: string,
  ): Promise<PaymentRecord | null> {
    const result = await this.database.query<PaymentRow>(
      `SELECT organization_id, payment_id, provider, provider_reference_id,
              status, amount::text, currency,
              order_status, webhook_processed, ledger_entry_present, updated_at, version
         FROM payments
        WHERE organization_id = $1 AND payment_id = $2`,
      [organizationId, paymentId],
    );
    const row = result.rows[0];
    if (row === undefined) {
      return null;
    }
    return {
      organizationId: row.organization_id,
      paymentId: row.payment_id,
      provider: row.provider,
      providerReferenceId: row.provider_reference_id,
      status: row.status,
      amount: row.amount,
      currency: row.currency,
      orderStatus: row.order_status,
      webhookProcessed: row.webhook_processed,
      ledgerEntryPresent: row.ledger_entry_present,
      updatedAt: row.updated_at.toISOString(),
      version: row.version,
    };
  }
}
