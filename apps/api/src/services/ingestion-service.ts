import type { OrderIngestion, WebhookIngestion } from '../domain/ingestion.js';
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
