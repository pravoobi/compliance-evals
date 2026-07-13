import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import {
  SqliteAuditStore,
  PiiEvaluator,
  DeterministicGroundednessEvaluator,
  DeterministicAdviceBoundaryEvaluator,
  RegressionRunner,
} from "@compliance-evals/core";
import type { RegressionReport, IssueCheckResult } from "@compliance-evals/core";

const DB_PATH = process.env["DB_PATH"] ?? join(process.cwd(), "data", "triage.db");

if (!existsSync(DB_PATH)) {
  console.error(`No database found at ${DB_PATH}`);
  console.error("Run the triage-ui and seed data before running the regression gate.");
  process.exit(2);
}

mkdirSync(join(process.cwd(), "data"), { recursive: true });

const store = new SqliteAuditStore(DB_PATH);

const runner = new RegressionRunner([
  new PiiEvaluator(),
  new DeterministicGroundednessEvaluator(),
  new DeterministicAdviceBoundaryEvaluator(),
]);

const report: RegressionReport = await runner.run(store);
store.close();

const RESET = "\x1b[0m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

console.log(`\n${BOLD}Regression Gate — compliance-evals${RESET}`);
console.log(`Checked at: ${report.checkedAt.toISOString()}`);
console.log(`Issues checked: ${report.totalIssues}\n`);

if (report.totalIssues === 0) {
  console.log(`${DIM}No issues to check. Promote failing samples to Issues in the triage UI.${RESET}\n`);
  process.exit(0);
}

function formatResult(r: IssueCheckResult): void {
  const icon =
    r.outcome === "regressed"
      ? `${RED}✗${RESET}`
      : r.outcome === "still-failing"
      ? `${YELLOW}~${RESET}`
      : `${GREEN}✓${RESET}`;

  const statusTag = `${DIM}[${r.issueStatus}]${RESET}`;
  console.log(`${icon} ${statusTag} ${r.issueTitle}`);

  if (r.outcome === "regressed" || r.outcome === "still-failing") {
    for (const sr of r.sampleResults) {
      if (sr.verdict === "fail") {
        for (const er of sr.evalResults) {
          if (er.verdict === "fail") {
            console.log(
              `    ${DIM}└─${RESET} sample ${sr.sampleId.slice(0, 8)}: ${er.evaluatorId} → fail`
            );
            console.log(`       ${DIM}${er.reasoning}${RESET}`);
          }
        }
      }
    }
  }
}

const regressed = report.results.filter((r) => r.outcome === "regressed");
const stillFailing = report.results.filter((r) => r.outcome === "still-failing");
const passing = report.results.filter((r) => r.outcome === "pass");

if (regressed.length > 0) {
  console.log(`${BOLD}${RED}Regressions (resolved issues now failing again):${RESET}`);
  regressed.forEach(formatResult);
  console.log();
}

if (stillFailing.length > 0) {
  console.log(`${BOLD}${YELLOW}Still failing (open/triaged — not blocking):${RESET}`);
  stillFailing.forEach(formatResult);
  console.log();
}

if (passing.length > 0) {
  console.log(`${BOLD}Passing:${RESET}`);
  passing.forEach(formatResult);
  console.log();
}

if (report.passed) {
  console.log(`${GREEN}${BOLD}Result: all checks passed. No regressions.${RESET}\n`);
  process.exit(0);
} else {
  console.log(
    `${RED}${BOLD}Result: ${report.regressions} regression(s) found. Gate failed.${RESET}\n`
  );
  process.exit(1);
}
