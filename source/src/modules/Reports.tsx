import { useState } from "react";
import { TESTS, type Test } from "../domain/types";
import {
  Panel,
  Field,
  Note,
  ErrorBox,
  describeError,
  type ModuleProps,
} from "../components/UI";
import AnalysisChart from "../components/AnalysisChart";
import { generateReport } from "../services/report";
import {
  workbookExport,
  csvExport,
  exportMeasurements,
} from "../services/files";
export default function Reports({ project, notify }: ModuleProps) {
  const [test, setTest] = useState<Test>("strength");
  const [scope, setScope] = useState("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pool = project.measurements.filter(
    (m) =>
      m.test === test &&
      (scope !== "experimental" || m.origin === "experimental"),
  );
  const conditions = [
    ...new Set(
      pool.map((r) =>
        JSON.stringify([
          r.exposure,
          r.method,
          r.phase,
          r.reference,
          r.unit,
          r.origin,
        ]),
      ),
    ),
  ];
  const [selected, setSelected] = useState("");
  const condition = conditions.includes(selected)
    ? selected
    : conditions[0] || "";
  const chartRows = pool.filter(
    (r) =>
      JSON.stringify([
        r.exposure,
        r.method,
        r.phase,
        r.reference,
        r.unit,
        r.origin,
      ]) === condition,
  );
  const dataRows =
    scope === "selected"
      ? chartRows
      : scope === "experimental"
        ? project.measurements.filter((m) => m.origin === "experimental")
        : project.measurements;
  const label = chartRows.length
    ? `${TESTS[test].label} · ${JSON.parse(condition).join(" / ")}`
    : "No chart measurements";
  return (
    <>
      <Panel
        title="Research report generator"
        description="Create an actual PDF with project details, recipes, quantities, specimen schedule, summaries, a plot, data, formulas and references."
      >
        <div className="form-grid">
          <Field label="Data appendix scope">
            <select value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="all">
                All project observations (includes sample data)
              </option>
              <option value="experimental">Experimental entries only</option>
              <option value="selected">Current chart selection only</option>
            </select>
          </Field>
          <Field label="Report plot indicator">
            <select
              value={test}
              onChange={(e) => setTest(e.target.value as Test)}
            >
              {Object.entries(TESTS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Plot condition">
            <select
              value={condition}
              onChange={(e) => setSelected(e.target.value)}
            >
              {conditions.map((c) => (
                <option value={c} key={c}>
                  {JSON.parse(c).filter(Boolean).join(" · ")}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <p className="small">
          Data appendix: {dataRows.length} observations. A large register will
          produce a multi-page PDF. The full Excel workbook includes all project
          data in separate sheets.
        </p>
        <ErrorBox message={error} />
        <div className="actions">
          <button
            className="primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await generateReport(
                  project,
                  dataRows,
                  "report-chart",
                  `${scope} data appendix. Plot: ${label}`,
                );
                notify("PDF report generated.");
                setError("");
              } catch (e) {
                setError(describeError(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Generating report…" : "Download PDF report"}
          </button>
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await workbookExport(project);
                notify("Excel workbook exported.");
              } catch (e) {
                setError(describeError(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            Download Excel workbook
          </button>
          <button
            disabled={!dataRows.length}
            onClick={() =>
              csvExport("report-measurements.csv", exportMeasurements(dataRows))
            }
          >
            Download appendix CSV
          </button>
        </div>
      </Panel>
      <Panel title="Report plot preview" description={label}>
        {chartRows.length ? (
          <AnalysisChart
            rows={chartRows}
            unit={chartRows[0].unit}
            id="report-chart"
          />
        ) : (
          <p>
            No observations for the plot selection. A PDF without a plot can
            still be generated.
          </p>
        )}
      </Panel>
      <Note>
        Reports describe your entered records and calculation methods. They do
        not certify laboratory procedures, validate scientific conclusions or
        replace an approved research protocol. Unicode unit symbols are
        transliterated in the PDF (for example, µA becomes uA).
      </Note>
    </>
  );
}
