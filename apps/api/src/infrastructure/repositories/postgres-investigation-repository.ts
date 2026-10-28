import type {
  CreateInvestigationInput,
  PersistedInvestigation,
} from '../../domain/operational-data.js';
import type { Queryable } from '../postgres/database.js';

type InvestigationRow = {
  id: string;
  organization_id: string;
  requested_by: string;
  payment_id: string | null;
  status: PersistedInvestigation['status'];
  rule_set_version: string;
  evaluation_timestamp: Date;
  input_fingerprint: string;
  result: unknown;
  error_code: string | null;
};

export class InvestigationRepository {
  public constructor(private readonly database: Queryable) {}

  public async create(
    organizationId: string,
    input: CreateInvestigationInput,
  ): Promise<PersistedInvestigation> {
    const result = await this.database.query<InvestigationRow>(
      `INSERT INTO investigations (
         organization_id, requested_by, payment_id, status, rule_set_version,
         evaluation_timestamp, input_fingerprint, result, error_code
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
       RETURNING id, organization_id, requested_by, payment_id, status,
                 rule_set_version, evaluation_timestamp, input_fingerprint,
                 result, error_code`,
      [
        organizationId,
        input.requestedBy,
        input.paymentId,
        input.status,
        input.ruleSetVersion,
        input.evaluationTimestamp,
        input.inputFingerprint,
        input.result === undefined ? null : JSON.stringify(input.result),
        input.errorCode ?? null,
      ],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new Error('Investigation creation returned no row');
    }
    return this.map(row);
  }

  public async findById(
    organizationId: string,
    investigationId: string,
  ): Promise<PersistedInvestigation | null> {
    const result = await this.database.query<InvestigationRow>(
      `SELECT id, organization_id, requested_by, payment_id, status,
              rule_set_version, evaluation_timestamp, input_fingerprint,
              result, error_code
         FROM investigations
        WHERE organization_id = $1 AND id = $2`,
      [organizationId, investigationId],
    );
    const row = result.rows[0];
    return row === undefined ? null : this.map(row);
  }

  private map(row: InvestigationRow): PersistedInvestigation {
    return {
      id: row.id,
      organizationId: row.organization_id,
      requestedBy: row.requested_by,
      paymentId: row.payment_id,
      status: row.status,
      ruleSetVersion: row.rule_set_version,
      evaluationTimestamp: row.evaluation_timestamp.toISOString(),
      inputFingerprint: row.input_fingerprint,
      result: row.result,
      errorCode: row.error_code,
    };
  }
}
