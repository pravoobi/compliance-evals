import { mkdirSync } from "fs";
import { join } from "path";
import { SqliteAuditStore } from "@compliance-evals/core";

const DB_PATH = process.env["DB_PATH"] ?? join(process.cwd(), "data", "triage.db");

let _store: SqliteAuditStore | null = null;

export function getStore(): SqliteAuditStore {
  if (!_store) {
    mkdirSync(join(process.cwd(), "data"), { recursive: true });
    _store = new SqliteAuditStore(DB_PATH);
  }
  return _store;
}
