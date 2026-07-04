import type {
  AuditRecord,
  EvalResult,
  Issue,
  Sample,
} from "@compliance-evals/types";

export interface AuditStore {
  saveSample(sample: Sample): void;
  getSample(id: string): Sample | undefined;
  listSamples(): Sample[];

  saveResult(result: EvalResult): void;
  getResult(id: string): EvalResult | undefined;
  listResults(sampleId?: string): EvalResult[];

  appendAuditRecord(record: AuditRecord): void;
  listAuditRecords(): AuditRecord[];
  verifyChain(): { valid: boolean; firstBadId?: string };

  saveIssue(issue: Issue): void;
  getIssue(id: string): Issue | undefined;
  listIssues(): Issue[];
  updateIssue(id: string, patch: Partial<Issue>): void;

  close(): void;
}
