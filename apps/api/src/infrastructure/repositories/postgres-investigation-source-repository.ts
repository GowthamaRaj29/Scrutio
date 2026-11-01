import {
  investigationEvidenceSchema,
  type InvestigationEvidence,
} from '../../domain/investigations.js';
import type { Queryable } from '../postgres/database.js';

type SourceRow = {
  organization_id: string;
  payment_id: string;
  payment_provider: string | null;
  payment_provider_reference_id: string | null;
  payment_status: InvestigationEvidence['payment']['status'];
  amount: string;
  currency: string;
  order_status: string | null;
  webhook_processed: boolean;
  ledger_entry_present: boolean;
  order_successful_payment_amount: string | null;
  order_successful_payment_count: number | null;
  posted_payment_credit_count: number | null;
  settlement_count: number;
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
  settlement_id: string | null;
  settlement_status: 'PENDING' | 'SETTLED' | 'FAILED' | null;
  settlement_amount: string | null;
  settlement_currency: string | null;
  settlement_settled_at: Date | null;
  provider_name: string | null;
  provider_event_id: string | null;
  provider_reference_id: string | null;
  provider_observed_status: string | null;
  provider_observed_at: Date | null;
  duplicate_provider_payment_ids: string[];
  burst_failed_payment_count: number | null;
  failure_rate_failed_payment_count: number | null;
  failure_rate_eligible_payment_count: number | null;
  webhook_failure_count: number | null;
};

export type InvestigationAggregateWindows = {
  burstFailureWindowHours: number;
  webhookStormWindowMinutes: number;
};

export class InvestigationSourceRepository {
  public constructor(
    private readonly database: Queryable,
    private readonly aggregateWindows: InvestigationAggregateWindows,
  ) {}

  public async findEvidence(
    organizationId: string,
    paymentId: string,
    evaluatedAt: string,
  ): Promise<InvestigationEvidence | null> {
    const result = await this.database.query<SourceRow>(
      `SELECT p.organization_id, p.payment_id, p.provider AS payment_provider,
              p.provider_reference_id AS payment_provider_reference_id,
              p.status AS payment_status,
              p.amount::text, p.currency, p.order_status, p.webhook_processed,
              p.ledger_entry_present, p.version, p.updated_at AS payment_updated_at,
              CASE WHEN p.order_id IS NULL THEN NULL ELSE order_totals.successful_amount END
                AS order_successful_payment_amount,
              CASE WHEN p.order_id IS NULL THEN NULL ELSE order_totals.successful_count END
                AS order_successful_payment_count,
              ledger_totals.posted_payment_credit_count,
              settlement_totals.settlement_count,
              o.order_id, o.status AS actual_order_status,
              o.amount::text AS order_amount, o.currency AS order_currency,
              w.event_id AS webhook_event_id, w.payment_id AS webhook_payment_id,
              w.signature_verified AS webhook_signature_verified,
              w.processing_status AS webhook_processing_status,
              w.received_at AS webhook_received_at,
              l.id AS ledger_entry_id, l.amount::text AS ledger_amount,
              l.currency AS ledger_currency, l.status AS ledger_status,
              s.settlement_id, s.status AS settlement_status,
              s.amount::text AS settlement_amount, s.currency AS settlement_currency,
              s.settled_at AS settlement_settled_at,
              pe.provider AS provider_name, pe.provider_event_id,
              pe.provider_reference_id, pe.observed_status AS provider_observed_status,
              pe.observed_at AS provider_observed_at,
              COALESCE(duplicates.payment_ids, ARRAY[]::varchar[]) AS duplicate_provider_payment_ids
              ,burst_totals.failed_payment_count AS burst_failed_payment_count
              ,rate_totals.failed_payment_count AS failure_rate_failed_payment_count
              ,rate_totals.eligible_payment_count AS failure_rate_eligible_payment_count
              ,webhook_totals.failed_event_count AS webhook_failure_count
         FROM payments p
         LEFT JOIN orders o
           ON o.organization_id = p.organization_id AND o.order_id = p.order_id
         LEFT JOIN LATERAL (
           SELECT COALESCE(SUM(successful.amount), 0)::text AS successful_amount,
                  COUNT(*)::int AS successful_count
             FROM payments successful
            WHERE p.order_id IS NOT NULL
              AND successful.organization_id = p.organization_id
              AND successful.order_id = p.order_id
              AND successful.status = 'SUCCESS'
         ) order_totals ON true
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
         LEFT JOIN LATERAL (
           SELECT COUNT(*)::int AS posted_payment_credit_count
             FROM ledger_entries posted
            WHERE posted.organization_id = p.organization_id
              AND posted.payment_id = p.payment_id
              AND posted.status = 'POSTED'
              AND posted.entry_type = 'PAYMENT_CREDIT'
         ) ledger_totals ON true
         LEFT JOIN LATERAL (
           SELECT s.settlement_id, s.status, s.amount, s.currency, s.settled_at
             FROM settlements s
             JOIN settlement_payments sp
               ON sp.organization_id = s.organization_id
              AND sp.settlement_id = s.id
            WHERE s.organization_id = p.organization_id AND sp.payment_id = p.payment_id
            ORDER BY s.created_at DESC
            LIMIT 1
         ) s ON true
         LEFT JOIN LATERAL (
           SELECT COUNT(DISTINCT sp.settlement_id)::int AS settlement_count
             FROM settlement_payments sp
            WHERE sp.organization_id = p.organization_id
              AND sp.payment_id = p.payment_id
         ) settlement_totals ON true
          LEFT JOIN LATERAL (
            SELECT provider, provider_event_id, provider_reference_id,
                   observed_status, observed_at
              FROM provider_payment_events
             WHERE organization_id = p.organization_id AND payment_id = p.payment_id
             ORDER BY observed_at DESC
             LIMIT 1
          ) pe ON true
         LEFT JOIN LATERAL (
           SELECT ARRAY_AGG(duplicate.payment_id ORDER BY duplicate.payment_id) AS payment_ids
             FROM payments duplicate
            WHERE duplicate.organization_id = p.organization_id
              AND p.provider_reference_id IS NOT NULL
              AND duplicate.provider_reference_id = p.provider_reference_id
              AND duplicate.payment_id <> p.payment_id
         ) duplicates ON true
         LEFT JOIN LATERAL (
           SELECT COUNT(DISTINCT failed.payment_id)::int AS failed_payment_count
             FROM provider_payment_events failed
            WHERE failed.organization_id = p.organization_id
              AND failed.observed_status = 'FAILED'
              AND failed.observed_at > $3::timestamptz - ($4::int * INTERVAL '1 hour')
              AND failed.observed_at <= $3::timestamptz
         ) burst_totals ON true
         LEFT JOIN LATERAL (
           SELECT COUNT(DISTINCT CASE WHEN events.observed_status = 'FAILED' THEN events.payment_id END)::int
                    AS failed_payment_count,
                  COUNT(DISTINCT events.payment_id)::int AS eligible_payment_count
             FROM provider_payment_events events
            WHERE events.organization_id = p.organization_id
              AND events.observed_status IN ('FAILED', 'SUCCESS')
              AND events.observed_at > $3::timestamptz - INTERVAL '1 hour'
              AND events.observed_at <= $3::timestamptz
         ) rate_totals ON true
         LEFT JOIN LATERAL (
           SELECT COUNT(DISTINCT failed.event_id)::int AS failed_event_count
             FROM webhook_events failed
            WHERE failed.organization_id = p.organization_id
              AND failed.processing_status = 'FAILED'
              AND failed.received_at > $3::timestamptz - ($5::int * INTERVAL '1 minute')
              AND failed.received_at <= $3::timestamptz
         ) webhook_totals ON true
        WHERE p.organization_id = $1 AND p.payment_id = $2`,
      [
        organizationId,
        paymentId,
        evaluatedAt,
        this.aggregateWindows.burstFailureWindowHours,
        this.aggregateWindows.webhookStormWindowMinutes,
      ],
    );
    const row = result.rows[0];
    if (row === undefined) {
      return null;
    }
    return investigationEvidenceSchema.parse({
      payment: {
        organizationId: row.organization_id,
        paymentId: row.payment_id,
        provider: row.payment_provider,
        providerReferenceId: row.payment_provider_reference_id,
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
      settlement:
        row.settlement_id === null ||
        row.settlement_status === null ||
        row.settlement_amount === null ||
        row.settlement_currency === null
          ? null
          : {
              settlementId: row.settlement_id,
              status: row.settlement_status,
              amount: row.settlement_amount,
              currency: row.settlement_currency,
              settledAt:
                row.settlement_settled_at === null ? null : row.settlement_settled_at.toISOString(),
            },
      orderSuccessfulPaymentAmount: row.order_successful_payment_amount,
      orderSuccessfulPaymentCount: row.order_successful_payment_count,
      postedPaymentCreditCount: row.posted_payment_credit_count,
      settlementCount: row.settlement_count,
      providerHistory:
        row.provider_name === null ||
        row.provider_event_id === null ||
        row.provider_observed_status === null ||
        row.provider_observed_at === null
          ? null
          : {
              provider: row.provider_name,
              providerEventId: row.provider_event_id,
              providerReferenceId: row.provider_reference_id,
              observedStatus: row.provider_observed_status,
              observedAt: row.provider_observed_at.toISOString(),
            },
      duplicateProviderPaymentIds: row.duplicate_provider_payment_ids,
      burstFailedPaymentCount: row.burst_failed_payment_count,
      failureRateFailedPaymentCount: row.failure_rate_failed_payment_count,
      failureRateEligiblePaymentCount: row.failure_rate_eligible_payment_count,
      webhookFailureCount: row.webhook_failure_count,
    });
  }
}
