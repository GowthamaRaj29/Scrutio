import type {
  CreateInvestigationInput,
  PersistedInvestigation,
  PersistedInvestigationFinding,
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

  public async addFinding(
    organizationId: string,
    investigationId: string,
    finding: Omit<PersistedInvestigationFinding, 'id' | 'organizationId' | 'investigationId'>,
  ): Promise<PersistedInvestigationFinding> {
    const result = await this.database.query<PersistedInvestigationFinding>(
      `INSERT INTO investigation_findings (
         organization_id, investigation_id, rule_id, rule_version,
         severity, status, explanation
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, organization_id AS "organizationId",
                 investigation_id AS "investigationId", rule_id AS "ruleId",
                 rule_version AS "ruleVersion", severity, status, explanation`,
      [
        organizationId,
        investigationId,
        finding.ruleId,
        finding.ruleVersion,
        finding.severity,
        finding.status,
        finding.explanation,
      ],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new Error('Investigation finding creation returned no row');
    }
    return row;
  }

  public async addEvidenceReference(
    organizationId: string,
    investigationId: string,
    findingId: string,
    sourceType: string,
    sourceId: string,
    fieldName: string | null,
  ): Promise<void> {
    await this.database.query(
      `INSERT INTO investigation_evidence_references (
         organization_id, investigation_id, finding_id, source_type, source_id, field_name
       ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [organizationId, investigationId, findingId, sourceType, sourceId, fieldName],
    );
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
