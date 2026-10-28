import type {
  LedgerEntryIngestion,
  OrderIngestion,
  PaymentProviderReferenceIngestion,
  ProviderPaymentEventIngestion,
  SettlementIngestion,
  WebhookIngestion,
} from '../domain/ingestion.js';
import type { Database, Queryable } from '../infrastructure/postgres/database.js';
import type { PaymentStatusService } from './payment-status-service.js';

export class IngestionConflictError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'IngestionConflictError';
  }
}

export class IngestionService {
  public constructor(
    private readonly database: Database,
    private readonly paymentStatusService: PaymentStatusService,
  ) {}

  public async ingestOrder(organizationId: string, input: OrderIngestion): Promise<void> {
    await this.database.withTransaction(organizationId, async (client) => {
      await this.upsertOrder(client, organizationId, input);
      if (input.paymentId !== undefined) {
        await this.linkPayment(client, organizationId, input);
      }
    });
    if (input.paymentId !== undefined) {
      this.paymentStatusService.invalidateAfterMutation(organizationId, input.paymentId);
    }
  }

  public async ingestWebhook(organizationId: string, input: WebhookIngestion): Promise<void> {
    const inserted = await this.database.withTransaction(organizationId, async (client) => {
      const existing = await client.query<{
        payment_id: string | null;
        event_type: string;
        signature_verified: boolean;
        processing_status: WebhookIngestion['processingStatus'];
        received_at: Date;
      }>(
        `SELECT payment_id, event_type, signature_verified, processing_status, received_at
           FROM webhook_events
          WHERE organization_id = $1 AND event_id = $2`,
        [organizationId, input.eventId],
      );
      const row = existing.rows[0];
      if (row !== undefined) {
        if (
          row.payment_id !== input.paymentId ||
          row.event_type !== input.eventType ||
          row.signature_verified !== input.signatureVerified ||
          row.processing_status !== input.processingStatus ||
          row.received_at.toISOString() !== input.receivedAt
        ) {
          throw new IngestionConflictError('Webhook event conflicts with an existing event');
        }
        return false;
      }
      await client.query(
        `INSERT INTO webhook_events (
           organization_id, event_id, payment_id, event_type, signature_verified,
           processing_status, received_at, processed_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          organizationId,
          input.eventId,
          input.paymentId,
          input.eventType,
          input.signatureVerified,
          input.processingStatus,
          input.receivedAt,
          input.processedAt ?? null,
        ],
      );
      return true;
    });
    if (inserted) {
      this.paymentStatusService.invalidateAfterMutation(organizationId, input.paymentId);
    }
  }

  public async ingestLedgerEntry(
    organizationId: string,
    input: LedgerEntryIngestion,
  ): Promise<void> {
    try {
      await this.database.withTransaction(organizationId, async (client) => {
        const debit = input.lines
          .filter((line) => line.direction === 'DEBIT')
          .reduce((total, line) => total + toCents(line.amount), 0n);
        const credit = input.lines
          .filter((line) => line.direction === 'CREDIT')
          .reduce((total, line) => total + toCents(line.amount), 0n);
        if (debit !== credit || debit !== toCents(input.amount)) {
          throw new IngestionConflictError('Ledger entry is not balanced');
        }
        if (input.lines.some((line) => line.currency !== input.currency)) {
          throw new IngestionConflictError('Ledger line currency must match entry currency');
        }
        const existing = await client.query<{ id: string }>(
          `SELECT id FROM ledger_entries
            WHERE organization_id = $1 AND source_event_id = $2`,
          [organizationId, input.sourceEventId],
        );
        if (existing.rows[0] !== undefined) {
          throw new IngestionConflictError('Ledger source event already exists');
        }
        const entry = await client.query<{ id: string }>(
          `INSERT INTO ledger_entries (
             organization_id, payment_id, account_id, entry_type, status,
             amount, currency, posted_at, source_event_id
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id`,
          [
            organizationId,
            input.paymentId ?? null,
            input.accountId,
            input.entryType,
            input.status,
            input.amount,
            input.currency,
            input.postedAt ?? null,
            input.sourceEventId,
          ],
        );
        const entryId = entry.rows[0]?.id;
        if (entryId === undefined) {
          throw new Error('Ledger entry creation returned no row');
        }
        for (const line of input.lines) {
          await client.query(
            `INSERT INTO journal_lines (
               organization_id, ledger_entry_id, direction, amount, currency
             ) VALUES ($1, $2, $3, $4, $5)`,
            [organizationId, entryId, line.direction, line.amount, line.currency],
          );
        }
        if (input.paymentId !== undefined) {
          await client.query(
            `UPDATE payments
                SET ledger_entry_present = true, version = version + 1, updated_at = NOW()
              WHERE organization_id = $1 AND payment_id = $2`,
            [organizationId, input.paymentId],
          );
        }
      });
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        throw new IngestionConflictError('Ledger source event already exists');
      }
      throw error;
    }
    if (input.paymentId !== undefined) {
      this.paymentStatusService.invalidateAfterMutation(organizationId, input.paymentId);
    }
  }

  public async ingestSettlement(organizationId: string, input: SettlementIngestion): Promise<void> {
    try {
      await this.database.withTransaction(organizationId, async (client) => {
        const existing = await client.query<{
          settlement_id: string;
          status: SettlementIngestion['status'];
          amount: string;
          currency: string;
          settlement_date: string;
        }>(
          `SELECT settlement_id, status, amount::text, currency, settlement_date::text
             FROM settlements
            WHERE organization_id = $1 AND source_event_id = $2`,
          [organizationId, input.sourceEventId],
        );
        const row = existing.rows[0];
        if (row !== undefined) {
          if (
            row.settlement_id !== input.settlementId ||
            row.status !== input.status ||
            row.amount !== input.amount ||
            row.currency !== input.currency ||
            row.settlement_date !== input.settlementDate
          ) {
            throw new IngestionConflictError(
              'Settlement source event conflicts with an existing settlement',
            );
          }

          return;
        }
        if (input.paymentIds.length > 0) {
          const payments = await client.query<{ payment_id: string; currency: string }>(
            `SELECT payment_id, currency
               FROM payments
              WHERE organization_id = $1 AND payment_id = ANY($2::varchar[])`,
            [organizationId, input.paymentIds],
          );
          if (payments.rowCount !== input.paymentIds.length) {
            throw new IngestionConflictError('Settlement references an unknown payment');
          }
          if (payments.rows.some((payment) => payment.currency !== input.currency)) {
            throw new IngestionConflictError('Settlement currency does not match payment currency');
          }
        }
        const settlement = await client.query<{ id: string }>(
          `INSERT INTO settlements (
             organization_id, settlement_id, status, amount, currency,
             settlement_date, settled_at, utr_number, source_event_id
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id`,
          [
            organizationId,
            input.settlementId,
            input.status,
            input.amount,
            input.currency,
            input.settlementDate,
            input.settledAt ?? null,
            input.utrNumber ?? null,
            input.sourceEventId,
          ],
        );
        const settlementId = settlement.rows[0]?.id;
        if (settlementId === undefined) {
          throw new Error('Settlement creation returned no row');
        }
        for (const paymentId of input.paymentIds) {
          await client.query(
            `INSERT INTO settlement_payments (organization_id, settlement_id, payment_id)
             VALUES ($1, $2, $3)`,
            [organizationId, settlementId, paymentId],
          );
        }
      });
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        throw new IngestionConflictError('Settlement source event already exists');
      }
      throw error;
    }
  }

  public async ingestProviderPaymentEvent(
    organizationId: string,
    input: ProviderPaymentEventIngestion,
  ): Promise<boolean> {
    try {
      const created = await this.database.withTransaction(organizationId, async (client) => {
        const result = await client.query(
          `INSERT INTO provider_payment_events (
             organization_id, payment_id, provider, provider_event_id,
             provider_reference_id, observed_status, observed_at, amount, currency
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (organization_id, provider_event_id) DO NOTHING
           RETURNING id`,
          [
            organizationId,
            input.paymentId,
            input.provider,
            input.providerEventId,
            input.providerReferenceId ?? null,
            input.observedStatus,
            input.observedAt,
            input.amount ?? null,
            input.currency ?? null,
          ],
        );
        if (result.rowCount === 1) {
          return true;
        }

        const existing = await client.query<{
          payment_id: string;
          provider: string;
          provider_reference_id: string | null;
          observed_status: string;
          observed_at: Date;
          amount: string | null;
          currency: string | null;
        }>(
          `SELECT payment_id, provider, provider_reference_id, observed_status,
                  observed_at, amount::text, currency
             FROM provider_payment_events
            WHERE organization_id = $1 AND provider_event_id = $2`,
          [organizationId, input.providerEventId],
        );
        const row = existing.rows[0];
        if (
          row === undefined ||
          row.payment_id !== input.paymentId ||
          row.provider !== input.provider ||
          row.provider_reference_id !== (input.providerReferenceId ?? null) ||
          row.observed_status !== input.observedStatus ||
          row.observed_at.toISOString() !== new Date(input.observedAt).toISOString() ||
          row.amount !== (input.amount ?? null) ||
          row.currency !== (input.currency ?? null)
        ) {
          throw new IngestionConflictError('Provider event conflicts with an existing event');
        }
        return false;
      });
      if (created) {
        this.paymentStatusService.invalidateAfterMutation(organizationId, input.paymentId);
      }
      return created;
    } catch (error: unknown) {
      throw error;
    }
  }

  public async setPaymentProviderReference(
    organizationId: string,
    paymentId: string,
    input: PaymentProviderReferenceIngestion,
  ): Promise<void> {
    const updated = await this.database.withTransaction(organizationId, async (client) => {
      const existing = await client.query<{
        provider: string | null;
        provider_reference_id: string | null;
      }>(
        `SELECT provider, provider_reference_id
           FROM payments
          WHERE organization_id = $1 AND payment_id = $2
          FOR UPDATE`,
        [organizationId, paymentId],
      );
      const row = existing.rows[0];
      if (row === undefined) {
        throw new IngestionConflictError('Payment not found');
      }
      if (row.provider !== null || row.provider_reference_id !== null) {
        if (
          row.provider === input.provider &&
          row.provider_reference_id === input.providerReferenceId
        ) {
          return false;
        }
        throw new IngestionConflictError('Payment provider reference cannot be overwritten');
      }
      await client.query(
        `UPDATE payments
            SET provider = $1, provider_reference_id = $2, version = version + 1,
                updated_at = NOW()
          WHERE organization_id = $3 AND payment_id = $4`,
        [input.provider, input.providerReferenceId, organizationId, paymentId],
      );
      return true;
    });
    if (updated) {
      this.paymentStatusService.invalidateAfterMutation(organizationId, paymentId);
    }
  }

  private async upsertOrder(
    client: Queryable,
    organizationId: string,
    input: OrderIngestion,
  ): Promise<void> {
    await client.query(
      `INSERT INTO orders (organization_id, order_id, status, amount, currency, updated_at)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, NOW()))
       ON CONFLICT (organization_id, order_id) DO UPDATE
         SET status = EXCLUDED.status, amount = EXCLUDED.amount,
             currency = EXCLUDED.currency, updated_at = EXCLUDED.updated_at`,
      [
        organizationId,
        input.orderId,
        input.status,
        input.amount,
        input.currency,
        input.updatedAt ?? null,
      ],
    );
  }

  private async linkPayment(
    client: Queryable,
    organizationId: string,
    input: OrderIngestion,
  ): Promise<void> {
    const result = await client.query(
      `UPDATE payments
          SET order_id = $1, order_status = $2, version = version + 1, updated_at = NOW()
        WHERE organization_id = $3 AND payment_id = $4`,
      [input.orderId, input.status, organizationId, input.paymentId],
    );
    if (result.rowCount !== 1) {
      throw new Error('Payment not found for order ingestion');
    }
  }
}

function toCents(amount: string): bigint {
  const parts = amount.split('.');
  const whole = parts[0] ?? '0';
  const fraction = parts[1] ?? '';
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}

function isUniqueViolation(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505'
  );
}
