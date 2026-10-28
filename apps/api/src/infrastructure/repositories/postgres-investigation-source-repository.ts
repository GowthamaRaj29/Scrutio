import {
  investigationEvidenceSchema,
  type InvestigationEvidence,
} from '../../domain/investigations.js';
import type { Queryable } from '../postgres/database.js';

type SourceRow = {
  organization_id: string;
  payment_id: string;
  payment_status: InvestigationEvidence['payment']['status'];
  amount: string;
  currency: string;
  order_status: string | null;
  webhook_processed: boolean;
  ledger_entry_present: boolean;
  version: number;
  payment_updated_at: Date;
  order_id: string | null;
  actual_order_status: string | null;
  order_amount: string | null;
  order_currency: string | null;
  webhook_event_id: string | null;
  webhook_payment_id: string | null;
  webhook_signature_verified: boolean | null;
  webhook_processing_status: 'RECEIVED' | 'PROCESSED' | 'FAILED' | null;
  webhook_received_at: Date | null;
  ledger_entry_id: string | null;
  ledger_amount: string | null;
  ledger_currency: string | null;
  ledger_status: 'PENDING' | 'POSTED' | 'REVERSED' | null;
};

export class InvestigationSourceRepository {
  public constructor(private readonly database: Queryable) {}

  public async findEvidence(
    organizationId: string,
    paymentId: string,
  ): Promise<InvestigationEvidence | null> {
    const result = await this.database.query<SourceRow>(
      `SELECT p.organization_id, p.payment_id, p.status AS payment_status,
              p.amount::text, p.currency, p.order_status, p.webhook_processed,
              p.ledger_entry_present, p.version, p.updated_at AS payment_updated_at,
              o.order_id, o.status AS actual_order_status,
              o.amount::text AS order_amount, o.currency AS order_currency,
              w.event_id AS webhook_event_id, w.payment_id AS webhook_payment_id,
              w.signature_verified AS webhook_signature_verified,
              w.processing_status AS webhook_processing_status,
              w.received_at AS webhook_received_at,
              l.id AS ledger_entry_id, l.amount::text AS ledger_amount,
              l.currency AS ledger_currency, l.status AS ledger_status
         FROM payments p
         LEFT JOIN orders o
           ON o.organization_id = p.organization_id AND o.order_id = p.order_id
         LEFT JOIN LATERAL (
           SELECT event_id, payment_id, signature_verified, processing_status, received_at
             FROM webhook_events
            WHERE organization_id = p.organization_id AND payment_id = p.payment_id
            ORDER BY received_at DESC
            LIMIT 1
         ) w ON true
         LEFT JOIN LATERAL (
           SELECT id, amount, currency, status
             FROM ledger_entries
            WHERE organization_id = p.organization_id AND payment_id = p.payment_id
            ORDER BY created_at DESC
            LIMIT 1
         ) l ON true
        WHERE p.organization_id = $1 AND p.payment_id = $2`,
      [organizationId, paymentId],
    );
    const row = result.rows[0];
    if (row === undefined) {
      return null;
    }
    return investigationEvidenceSchema.parse({
      payment: {
        organizationId: row.organization_id,
        paymentId: row.payment_id,
        status: row.payment_status,
        amount: row.amount,
        currency: row.currency,
        orderStatus: row.order_status,
        webhookProcessed: row.webhook_processed,
        ledgerEntryPresent: row.ledger_entry_present,
        updatedAt: row.payment_updated_at.toISOString(),
        version: row.version,
      },
      order:
        row.order_id === null || row.order_amount === null || row.order_currency === null
          ? null
          : {
              orderId: row.order_id,
              status: row.actual_order_status ?? 'PENDING',
              amount: row.order_amount,
              currency: row.order_currency,
            },
      webhook:
        row.webhook_event_id === null ||
        row.webhook_signature_verified === null ||
        row.webhook_processing_status === null ||
        row.webhook_received_at === null
          ? null
          : {
              eventId: row.webhook_event_id,
              paymentId: row.webhook_payment_id,
              signatureVerified: row.webhook_signature_verified,
              processingStatus: row.webhook_processing_status,
              receivedAt: row.webhook_received_at.toISOString(),
            },
      ledger:
        row.ledger_entry_id === null ||
        row.ledger_amount === null ||
        row.ledger_currency === null ||
        row.ledger_status === null
          ? null
          : {
              entryId: row.ledger_entry_id,
              amount: row.ledger_amount,
              currency: row.ledger_currency,
              status: row.ledger_status,
            },
    });
  }
}
