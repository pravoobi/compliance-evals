import {
  PiiEvaluator,
  DeterministicGroundednessEvaluator,
  buildAuditRecord,
} from "@compliance-evals/core";
import type { AuditStore } from "@compliance-evals/core";
import type { Sample } from "@compliance-evals/types";

const pii = new PiiEvaluator();
const groundedness = new DeterministicGroundednessEvaluator();

export async function runEvalsForSample(
  store: AuditStore,
  sample: Sample
): Promise<void> {
  const lastRecord = store.listAuditRecords().at(-1);
  const prevHash = lastRecord?.hash ?? "";

  for (const evaluator of [pii, groundedness]) {
    const result = await evaluator.evaluate(sample);
    store.saveResult(result);

    const record = buildAuditRecord(
      { resultId: result.id, actor: "system", action: "run-eval" },
      store.listAuditRecords().at(-1)?.hash ?? prevHash
    );
    store.appendAuditRecord(record);
  }
}
