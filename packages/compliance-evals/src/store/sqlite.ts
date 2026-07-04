import { DatabaseSync } from "node:sqlite";
import { createHash, randomUUID } from "crypto";
import type {
  AuditRecord,
  EvalResult,
  Issue,
  Sample,
} from "@compliance-evals/types";
import {
  AuditRecordSchema,
  EvalResultSchema,
  IssueSchema,
  SampleSchema,
} from "@compliance-evals/types";
import type { AuditStore } from "./audit-store.js";

export function computeRecordHash(record: Omit<AuditRecord, "hash">): string {
  const payload = JSON.stringify({
    id: record.id,
    prevHash: record.prevHash,
    resultId: record.resultId,
    actor: record.actor,
    action: record.action,
    reason: record.reason ?? null,
    createdAt: record.createdAt.toISOString(),
  });
  return createHash("sha256").update(payload).digest("hex");
}

const DDL = `
CREATE TABLE IF NOT EXISTS samples (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS eval_results (
  id TEXT PRIMARY KEY,
  sample_id TEXT NOT NULL,
  data TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_records (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  prev_hash TEXT NOT NULL,
  hash TEXT NOT NULL,
  result_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  data TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS issues (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL
);
`;

export class SqliteAuditStore implements AuditStore {
  private readonly db: DatabaseSync;

  constructor(dbPath: string) {
    this.db = new DatabaseSync(dbPath);
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec(DDL);
  }

  saveSample(sample: Sample): void {
    this.db
      .prepare("INSERT OR REPLACE INTO samples (id, data) VALUES (?, ?)")
      .run(sample.id, JSON.stringify(sample));
  }

  getSample(id: string): Sample | undefined {
    const row = this.db
      .prepare("SELECT data FROM samples WHERE id = ?")
      .get(id) as { data: string } | undefined;
    return row ? SampleSchema.parse(JSON.parse(row.data)) : undefined;
  }

  listSamples(): Sample[] {
    const rows = this.db
      .prepare("SELECT data FROM samples ORDER BY rowid")
      .all() as { data: string }[];
    return rows.map((r) => SampleSchema.parse(JSON.parse(r.data)));
  }

  saveResult(result: EvalResult): void {
    this.db
      .prepare(
        "INSERT OR REPLACE INTO eval_results (id, sample_id, data) VALUES (?, ?, ?)"
      )
      .run(result.id, result.sampleId, JSON.stringify(result));
  }

  getResult(id: string): EvalResult | undefined {
    const row = this.db
      .prepare("SELECT data FROM eval_results WHERE id = ?")
      .get(id) as { data: string } | undefined;
    return row ? EvalResultSchema.parse(JSON.parse(row.data)) : undefined;
  }

  listResults(sampleId?: string): EvalResult[] {
    const rows = (
      sampleId
        ? this.db
            .prepare("SELECT data FROM eval_results WHERE sample_id = ? ORDER BY rowid")
            .all(sampleId)
        : this.db
            .prepare("SELECT data FROM eval_results ORDER BY rowid")
            .all()
    ) as { data: string }[];
    return rows.map((r) => EvalResultSchema.parse(JSON.parse(r.data)));
  }

  appendAuditRecord(record: AuditRecord): void {
    const last = this.db
      .prepare("SELECT hash FROM audit_records ORDER BY seq DESC LIMIT 1")
      .get() as { hash: string } | undefined;
    const expectedPrevHash = last?.hash ?? "";
    if (record.prevHash !== expectedPrevHash) {
      throw new Error(
        `prevHash mismatch: expected "${expectedPrevHash}", got "${record.prevHash}"`
      );
    }
    const expectedHash = computeRecordHash(record);
    if (record.hash !== expectedHash) {
      throw new Error(
        `hash mismatch: expected "${expectedHash}", got "${record.hash}"`
      );
    }
    this.db
      .prepare(
        `INSERT INTO audit_records (id, prev_hash, hash, result_id, actor, action, data)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        record.id,
        record.prevHash,
        record.hash,
        record.resultId,
        record.actor,
        record.action,
        JSON.stringify(record)
      );
  }

  listAuditRecords(): AuditRecord[] {
    const rows = this.db
      .prepare("SELECT data FROM audit_records ORDER BY seq")
      .all() as { data: string }[];
    return rows.map((r) => AuditRecordSchema.parse(JSON.parse(r.data)));
  }

  verifyChain(): { valid: boolean; firstBadId?: string } {
    const rows = this.db
      .prepare("SELECT id, prev_hash, hash, data FROM audit_records ORDER BY seq")
      .all() as { id: string; prev_hash: string; hash: string; data: string }[];

    let prevHash = "";
    for (const row of rows) {
      const record = AuditRecordSchema.parse(JSON.parse(row.data));
      const expected = computeRecordHash(record);
      if (row.hash !== expected || row.prev_hash !== prevHash) {
        return { valid: false, firstBadId: row.id };
      }
      prevHash = row.hash;
    }
    return { valid: true };
  }

  saveIssue(issue: Issue): void {
    this.db
      .prepare("INSERT OR REPLACE INTO issues (id, data) VALUES (?, ?)")
      .run(issue.id, JSON.stringify(issue));
  }

  getIssue(id: string): Issue | undefined {
    const row = this.db
      .prepare("SELECT data FROM issues WHERE id = ?")
      .get(id) as { data: string } | undefined;
    return row ? IssueSchema.parse(JSON.parse(row.data)) : undefined;
  }

  listIssues(): Issue[] {
    const rows = this.db
      .prepare("SELECT data FROM issues ORDER BY rowid")
      .all() as { data: string }[];
    return rows.map((r) => IssueSchema.parse(JSON.parse(r.data)));
  }

  updateIssue(id: string, patch: Partial<Issue>): void {
    const existing = this.getIssue(id);
    if (!existing) throw new Error(`Issue ${id} not found`);
    const updated = IssueSchema.parse({ ...existing, ...patch, updatedAt: new Date() });
    this.saveIssue(updated);
  }

  close(): void {
    this.db.close();
  }
}

export function buildAuditRecord(
  params: Omit<AuditRecord, "id" | "prevHash" | "hash" | "createdAt">,
  prevHash: string
): AuditRecord {
  const id = randomUUID();
  const createdAt = new Date();
  const partial: Omit<AuditRecord, "hash"> = {
    id,
    prevHash,
    resultId: params.resultId,
    actor: params.actor,
    action: params.action,
    reason: params.reason,
    createdAt,
  };
  return { ...partial, hash: computeRecordHash(partial) };
}
