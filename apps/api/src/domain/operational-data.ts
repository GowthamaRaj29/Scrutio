import { z } from 'zod';

export const investigationStatusSchema = z.enum([
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'PARTIAL',
  'FAILED',
  'CANCELLED',
]);

export type PersistedInvestigation = {
  id: string;
  organizationId: string;
  requestedBy: string;
  paymentId: string | null;
  status: z.infer<typeof investigationStatusSchema>;
  ruleSetVersion: string;
  evaluationTimestamp: string;
  inputFingerprint: string;
  result: unknown;
  errorCode: string | null;
};

export type CreateInvestigationInput = Omit<
  PersistedInvestigation,
  'id' | 'result' | 'errorCode'
> & {
  result?: unknown;
  errorCode?: string;
};
