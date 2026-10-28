import { createHash } from 'node:crypto';
import { InvestigationEngine } from './investigation-engine.js';
import { InvestigationSourceRepository } from '../infrastructure/repositories/postgres-investigation-source-repository.js';
import { InvestigationRepository } from '../infrastructure/repositories/postgres-investigation-repository.js';
import type { Database } from '../infrastructure/postgres/database.js';
import type { PersistedInvestigation } from '../domain/operational-data.js';

export class InvestigationNotFoundError extends Error {
  public constructor() {
    super('Investigation not found');
    this.name = 'InvestigationNotFoundError';
  }
}

export class InvestigationService {
  public constructor(
    private readonly database: Database,
    private readonly engine: InvestigationEngine = new InvestigationEngine(),
  ) {}

  public async execute(
    organizationId: string,
    requestedBy: string,
    paymentId: string,
    evaluationTimestamp: string,
  ): Promise<PersistedInvestigation> {
    return this.database.withTransaction(organizationId, async (client) => {
      const sourceRepository = new InvestigationSourceRepository(client);
      const evidence = await sourceRepository.findEvidence(organizationId, paymentId);
      if (evidence === null) {
        throw new InvestigationNotFoundError();
      }
      const result = this.engine.evaluate(evidence, evaluationTimestamp);
      const inputFingerprint = createHash('sha256').update(JSON.stringify(evidence)).digest('hex');
      const hasInsufficientEvidence = result.evaluations.some(
        (evaluation) => evaluation.status === 'INSUFFICIENT_EVIDENCE',
      );
      const repository = new InvestigationRepository(client);
      const investigation = await repository.create(organizationId, {
        organizationId,
        requestedBy,
        paymentId,
        status: hasInsufficientEvidence ? 'PARTIAL' : 'COMPLETED',
        ruleSetVersion: result.ruleSetVersion,
        evaluationTimestamp,
        inputFingerprint,
        result,
      });
      for (const findingResult of result.findings) {
        const finding = await repository.addFinding(organizationId, investigation.id, {
          ruleId: findingResult.ruleId,
          ruleVersion: findingResult.ruleVersion,
          severity: findingResult.severity,
          status: 'MATCH',
          explanation: findingResult.explanation,
        });
        for (const reference of findingResult.evidenceReferences) {
          await repository.addEvidenceReference(
            organizationId,
            investigation.id,
            finding.id,
            reference.startsWith('webhook.')
              ? 'webhook'
              : reference.startsWith('order.')
                ? 'order'
                : reference.startsWith('ledger.')
                  ? 'ledger'
                  : reference.startsWith('settlement.')
                    ? 'settlement'
                    : 'payment',
            reference.startsWith('payment.duplicate.')
              ? reference.slice('payment.duplicate.'.length)
              : reference.startsWith('webhook.') && evidence.webhook !== null
                ? evidence.webhook.eventId
                : reference.startsWith('order.') && evidence.order !== null
                  ? evidence.order.orderId
                  : reference.startsWith('ledger.') && evidence.ledger !== null
                    ? evidence.ledger.entryId
                    : reference.startsWith('settlement.') && evidence.settlement !== null
                      ? evidence.settlement.settlementId
                      : evidence.payment.paymentId,
            reference,
          );
        }
      }
      return investigation;
    });
  }

  public async findById(
    organizationId: string,
    investigationId: string,
  ): Promise<PersistedInvestigation> {
    const investigation = await this.database.withTransaction(organizationId, (client) =>
      new InvestigationRepository(client).findById(organizationId, investigationId),
    );
    if (investigation === null) {
      throw new InvestigationNotFoundError();
    }
    return investigation;
  }
}
