export class MissingCredentialsError extends Error {
  constructor(evaluatorName: string) {
    super(
      `${evaluatorName} requires an ANTHROPIC_API_KEY environment variable. ` +
        `Set it or use the deterministic stub evaluator instead.`
    );
    this.name = "MissingCredentialsError";
  }
}

export class TamperDetectedError extends Error {
  constructor(recordId: string) {
    super(
      `Audit chain tamper detected at record ${recordId}. ` +
        `The stored hash does not match the recomputed hash.`
    );
    this.name = "TamperDetectedError";
  }
}
