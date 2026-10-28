import type { PaymentRecord, PaymentRepository } from '../../domain/payments.js';

export class InMemoryPaymentRepository implements PaymentRepository {
  private readonly records = new Map<string, PaymentRecord>();

  public constructor(records: PaymentRecord[] = []) {
    for (const record of records) {
      this.records.set(this.key(record.organizationId, record.paymentId), record);
    }
  }

  public findByOrganizationAndPaymentId(
    organizationId: string,
    paymentId: string,
  ): Promise<PaymentRecord | null> {
    return Promise.resolve(this.records.get(this.key(organizationId, paymentId)) ?? null);
  }

  public upsert(record: PaymentRecord): void {
    this.records.set(this.key(record.organizationId, record.paymentId), record);
  }

  private key(organizationId: string, paymentId: string): string {
    return `${organizationId}:${paymentId}`;
  }
}
