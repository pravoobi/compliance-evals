import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { randomUUID } from "crypto";
import { tmpdir } from "os";
import { join } from "path";
import { unlinkSync, existsSync } from "fs";
import { SqliteAuditStore, buildAuditRecord } from "../store/sqlite.js";
import type { EvalResult } from "@compliance-evals/types";

function makeResult(): EvalResult {
  return {
    id: randomUUID(),
    sampleId: randomUUID(),
    evaluatorId: "pii-leakage-v1",
    evaluatorVersion: "1.0.0",
    verdict: "fail",
    reasoning: "test",
    createdAt: new Date(),
  };
}

let dbPath: string;
let store: SqliteAuditStore;

beforeEach(() => {
  dbPath = join(tmpdir(), `audit-test-${Date.now()}.db`);
  store = new SqliteAuditStore(dbPath);
});

afterEach(() => {
  store.close();
  if (existsSync(dbPath)) unlinkSync(dbPath);
});

describe("SqliteAuditStore — hash chain", () => {
  it("verifies a chain of records", () => {
    const r1 = makeResult();
    const r2 = makeResult();

    store.saveResult(r1);
    store.saveResult(r2);

    const rec1 = buildAuditRecord(
      { resultId: r1.id, actor: "test-user", action: "run-eval" },
      ""
    );
    store.appendAuditRecord(rec1);

    const rec2 = buildAuditRecord(
      { resultId: r2.id, actor: "test-user", action: "accept", reason: "looks good" },
      rec1.hash
    );
    store.appendAuditRecord(rec2);

    const { valid } = store.verifyChain();
    expect(valid).toBe(true);
  });

  it("detects tampered hash", () => {
    const r1 = makeResult();
    store.saveResult(r1);
    const rec1 = buildAuditRecord(
      { resultId: r1.id, actor: "test-user", action: "run-eval" },
      ""
    );
    store.appendAuditRecord(rec1);

    // Directly tamper with the DB
    const db = (store as unknown as { db: import("node:sqlite").DatabaseSync }).db;
    db.prepare("UPDATE audit_records SET hash = ? WHERE id = ?").run(
      "0000000000000000000000000000000000000000000000000000000000000000",
      rec1.id
    );

    const { valid, firstBadId } = store.verifyChain();
    expect(valid).toBe(false);
    expect(firstBadId).toBe(rec1.id);
  });

  it("rejects record with wrong prevHash", () => {
    const r1 = makeResult();
    store.saveResult(r1);
    const rec1 = buildAuditRecord(
      { resultId: r1.id, actor: "test-user", action: "run-eval" },
      ""
    );
    store.appendAuditRecord(rec1);

    const r2 = makeResult();
    store.saveResult(r2);
    const rec2 = buildAuditRecord(
      { resultId: r2.id, actor: "test-user", action: "accept" },
      "wrong-hash"
    );
    expect(() => store.appendAuditRecord(rec2)).toThrow(/prevHash mismatch/);
  });

  it("chain is empty-valid on a fresh store", () => {
    const { valid } = store.verifyChain();
    expect(valid).toBe(true);
  });
});

describe("SqliteAuditStore — samples and issues", () => {
  it("round-trips samples", () => {
    const sample = {
      id: randomUUID(),
      input: "test input",
      output: "test output",
      createdAt: new Date(),
    };
    store.saveSample(sample);
    const loaded = store.getSample(sample.id);
    expect(loaded?.id).toBe(sample.id);
    expect(loaded?.input).toBe("test input");
  });

  it("lists results by sampleId", () => {
    const r1 = makeResult();
    const r2 = { ...makeResult(), sampleId: r1.sampleId };
    const r3 = makeResult();
    store.saveResult(r1);
    store.saveResult(r2);
    store.saveResult(r3);
    const results = store.listResults(r1.sampleId);
    expect(results.length).toBe(2);
  });

  it("creates and updates issues", () => {
    const issue = {
      id: randomUUID(),
      title: "PII leaked in account summary",
      status: "open" as const,
      sampleIds: [randomUUID()],
      evalCriteria: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    store.saveIssue(issue);
    store.updateIssue(issue.id, { status: "triaged" });
    const loaded = store.getIssue(issue.id);
    expect(loaded?.status).toBe("triaged");
  });
});
