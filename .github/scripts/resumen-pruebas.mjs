// Writes a test and coverage summary to the GitHub job summary page ($GITHUB_STEP_SUMMARY), so a
// run shows its results without opening the log. Inputs: the Jest/Vitest JSON report
// (--json / --reporter=json) and Istanbul's coverage-summary.json. A missing file is reported,
// never fatal: this step runs after the tests even when they fail.
// Usage: node resumen-pruebas.mjs "<title>" <results.json> <coverage-summary.json>
import { appendFileSync, existsSync, readFileSync } from "node:fs";

const [titulo, resultados, cobertura] = process.argv.slice(2);
const leer = (p) => (p && existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);
const r = leer(resultados);
const c = leer(cobertura)?.total;
const out = [`### ${titulo}`, ""];

if (r) {
  const ok = r.numFailedTests === 0 && r.success !== false;
  out.push(
    "| Result | Suites | Tests | Passed | Failed | Skipped |",
    "|---|---|---|---|---|---|",
    `| ${ok ? "✅ passed" : "❌ failed"} | ${r.numTotalTestSuites} | ${r.numTotalTests} | ${r.numPassedTests} | ${r.numFailedTests} | ${r.numPendingTests + (r.numTodoTests ?? 0)} |`,
    "",
  );
  const fallidas = (r.testResults ?? []).flatMap((s) =>
    (s.assertionResults ?? [])
      .filter((t) => t.status === "failed")
      .map((t) => `- \`${s.name.split("/").slice(-2).join("/")}\` · ${t.fullName ?? t.title}`),
  );
  if (fallidas.length) out.push("**Failed tests**", "", ...fallidas.slice(0, 30), "");
} else {
  out.push("No test report (the tests did not run).", "");
}

if (c) {
  const pct = (k) => `${c[k].pct.toFixed(1)} %`;
  out.push(
    "| Coverage | Lines | Statements | Functions | Branches |",
    "|---|---|---|---|---|",
    `| gate: 70 / 70 / 70 / 60 | ${pct("lines")} | ${pct("statements")} | ${pct("functions")} | ${pct("branches")} |`,
    "",
  );
}

const destino = process.env.GITHUB_STEP_SUMMARY;
if (destino) appendFileSync(destino, out.join("\n") + "\n");
else process.stdout.write(out.join("\n") + "\n");
