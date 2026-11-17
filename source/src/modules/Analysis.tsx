import { chartSVG } from "../services/chart";
import { useState } from "react";
import { TESTS, type Test, type Measurement } from "../domain/types";
import {
  groupStats,
  percentChange,
  corrosionRuns,
} from "../domain/calculations";
import AnalysisChart, { type ChartMode } from "../components/AnalysisChart";
import {
  Panel,
  Field,
  Num,
  Table,
  Note,
  ErrorBox,
  Empty,
  Badge,
  fmt,
  describeError,
  type ModuleProps,
} from "../components/UI";
import { csvExport, exportMeasurements, download } from "../services/files";
export function svgDownload(id: string, description: string) {
  const chart = chartSVG(id, description);
  download("research-plot.svg", chart.xml, "image/svg+xml");
}
const unique = (rows: Measurement[], key: keyof Measurement) =>
  [...new Set(rows.map((r) => String(r[key])))].sort();
export default function DataAnalysis({
  project,
  notify,
  durability = false,
}: ModuleProps & { durability?: boolean }) {
  const [test, setTest] = useState<Test>(durability ? "mass" : "strength");
  const [origin, setOrigin] = useState("");
  const [exposure, setExposure] = useState("");
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");
  const [phase, setPhase] = useState("");
  const [minAge, setMinAge] = useState(0);
  const [maxAge, setMaxAge] = useState(3650);
  const [mode, setMode] = useState<ChartMode>("line");
  const [control, setControl] = useState(
    project.mixes.find((m) => m.control)?.id || project.mixes[0]?.id || "",
  );
  const [mixFilter, setMixFilter] = useState("");
  const [tool, setTool] = useState("Compare indicators");
  const candidates = project.measurements.filter((r) => r.test === test);
  const origins = unique(candidates, "origin");
  const o = origins.includes(origin) ? origin : origins[0] || "";
  const a = candidates.filter((r) => r.origin === o);
  const exposures = unique(a, "exposure");
  const exp = exposures.includes(exposure) ? exposure : exposures[0] || "";
  const b = a.filter((r) => r.exposure === exp);
  const methods = unique(b, "method");
  const met = methods.includes(method) ? method : methods[0] || "";
  const c = b.filter((r) => r.method === met);
  const references = unique(c, "reference");
  const ref = references.includes(reference) ? reference : references[0] || "";
  const d = c.filter((r) => r.reference === ref);
  const phases = unique(d, "phase");
  const ph = phases.includes(phase) ? phase : phases[0] || "";
  const unitOptions = unique(
    d.filter((r) => r.phase === ph),
    "unit",
  );
  const [unitChoice, setUnitChoice] = useState("");
  const unit = unitOptions.includes(unitChoice)
    ? unitChoice
    : unitOptions[0] || TESTS[test].unit;
  const filtered = d.filter(
    (r) =>
      r.phase === ph &&
      r.unit === unit &&
      r.age >= minAge &&
      r.age <= maxAge &&
      (!mixFilter || r.mixId === mixFilter),
  );
  const summary = groupStats(filtered);
  const controls = groupStats(
    d.filter(
      (r) =>
        r.phase === ph &&
        r.unit === unit &&
        r.age >= minAge &&
        r.age <= maxAge &&
        r.mixId === control,
    ),
  );
  const choices = [
    "Compare indicators",
    "Chloride exposure",
    "Sulphate exposure",
    "Combined exposure",
    "Wet–dry cycles",
    "Corrosion monitoring",
  ];
  return (
    <>
      {durability && (
        <div className="tool-tabs">
          {choices.map((name) => (
            <button
              key={name}
              className={tool === name ? "selected" : ""}
              onClick={() => {
                setTool(name);
                if (name === "Corrosion monitoring") setTest("potential");
                else if (name === "Chloride exposure") {
                  setTest("chloride");
                  setExposure("Chloride");
                } else if (name === "Sulphate exposure") {
                  setTest("mass");
                  setExposure("Sulphate");
                } else if (name === "Combined exposure") {
                  setTest("mass");
                  setExposure("Combined chloride–sulphate");
                } else if (name === "Wet–dry cycles") {
                  setTest("mass");
                  setExposure("Wet–dry cycles");
                }
              }}
            >
              {name}
            </button>
          ))}
        </div>
      )}
      {durability && (
        <Note>
          Compare each indicator within its own units, method and exposure.
          Higher strength or resistivity alone does not establish overall
          durability. Missing measurements are shown as missing, not inferred.
        </Note>
      )}
      <Panel
        title={durability ? tool : "Research data analysis"}
        description="Descriptive analysis. Groups keep age, cycle, phase, exposure, method, units, electrode and data origin separate."
      >
        <div className="form-grid cols-3">
          <Field label="Measurement indicator">
            <select
              value={test}
              onChange={(e) => setTest(e.target.value as Test)}
            >
              {Object.entries(TESTS).map(([k, t]) => (
                <option key={k} value={k}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Data origin">
            <select value={o} onChange={(e) => setOrigin(e.target.value)}>
              {origins.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Field>
          <Field label="Exposure">
            <select value={exp} onChange={(e) => setExposure(e.target.value)}>
              {exposures.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Field>
          <Field label="Method">
            <select value={met} onChange={(e) => setMethod(e.target.value)}>
              {methods.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Field>
          <Field label="Phase">
            <select value={ph} onChange={(e) => setPhase(e.target.value)}>
              {phases.map((v) => (
                <option key={v} value={v}>
                  {v || "(not recorded)"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Unit">
            <select
              value={unit}
              onChange={(e) => setUnitChoice(e.target.value)}
            >
              {unitOptions.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Field>
          {test === "potential" && (
            <Field label="Reference electrode">
              <select
                value={ref}
                onChange={(e) => setReference(e.target.value)}
              >
                {references.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Minimum age (days)">
            <Num value={minAge} onChange={setMinAge} min={0} />
          </Field>
          <Field label="Maximum age (days)">
            <Num value={maxAge} onChange={setMaxAge} min={0} />
          </Field>
          <Field label="Mix filter">
            <select
              value={mixFilter}
              onChange={(e) => setMixFilter(e.target.value)}
            >
              <option value="">All mixes in this condition</option>
              {project.mixes.map((m) => (
                <option key={m.id}>{m.id}</option>
              ))}
            </select>
          </Field>
          <Field label="Control for comparison">
            <select
              value={control}
              onChange={(e) => setControl(e.target.value)}
            >
              <option value="">None</option>
              {project.mixes.map((m) => (
                <option key={m.id}>{m.id}</option>
              ))}
            </select>
          </Field>
          <Field label="Chart type">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as ChartMode)}
            >
              <option value="line">Line · group means ± SD</option>
              <option value="bar">Bar · group means ± SD</option>
              <option value="scatter">Scatter · individual readings</option>
            </select>
          </Field>
        </div>
        {(!Number.isFinite(minAge) ||
          !Number.isFinite(maxAge) ||
          minAge > maxAge) && (
          <ErrorBox message="Enter a valid age range, minimum ≤ maximum." />
        )}
      </Panel>
      <Panel
        title={TESTS[test].label}
        description={`${filtered.length} observations · ${exp || "no exposure"} · ${met} · ${ph || "no phase"} · ${o || "no origin"}${ref ? " · " + ref : ""}`}
        action={
          <Badge tone={o === "sample" ? "amber" : "teal"}>
            {o === "sample" ? "Synthetic example" : "Experimental records"}
          </Badge>
        }
      >
        {filtered.length ? (
          <AnalysisChart rows={filtered} mode={mode} unit={unit} />
        ) : (
          <Empty>
            No data for this selection. Add laboratory readings or import a
            dataset to analyse this indicator.
          </Empty>
        )}
        <p className="small">
          Error bars show sample standard deviation (n−1), not confidence
          intervals; n=1 has no estimated SD. Scatter points are individual
          readings. Independence of replicates is the researcher's
          responsibility.
        </p>
        <div className="actions">
          <button
            disabled={!filtered.length}
            onClick={() => {
              try {
                svgDownload(
                  "analysis-chart",
                  `${TESTS[test].label}; unit=${unit}; exposure=${exp}; method=${met}; phase=${ph}; origin=${o}; reference=${ref}.`,
                );
                notify("Plot exported as SVG.");
              } catch (e) {
                notify(describeError(e));
              }
            }}
          >
            Download plot SVG
          </button>
          <button
            disabled={!filtered.length}
            onClick={() =>
              csvExport(
                "filtered-measurements.csv",
                exportMeasurements(filtered),
              )
            }
          >
            Download filtered data
          </button>
          <button
            disabled={!summary.length}
            onClick={() =>
              csvExport(
                "statistical-summary.csv",
                summary.map((g) => {
                  const base = controls.find(
                    (b) => b.age === g.age && b.cycle === g.cycle,
                  );
                  return {
                    mixId: g.mixId,
                    test: g.test,
                    age: g.age,
                    cycle: g.cycle,
                    phase: g.phase,
                    exposure: g.exposure,
                    method: g.method,
                    unit: g.unit,
                    reference: g.reference,
                    origin: g.origin,
                    n: g.n,
                    mean: g.mean,
                    sampleSD: g.sd,
                    minimum: g.min,
                    maximum: g.max,
                    controlMix: control,
                    controlMean: base?.mean ?? "",
                    difference: base ? g.mean - base.mean : "",
                    changePercent:
                      test === "potential" || !base
                        ? ""
                        : (percentChange(g.mean, base.mean) ?? ""),
                  };
                }),
              )
            }
          >
            Download summary CSV
          </button>
        </div>
      </Panel>
      <Panel title="Group comparison">
        <Table
          headers={[
            "Mix / age",
            "n",
            "Mean",
            "Sample SD",
            "Control mean",
            "Difference",
            "Change %",
          ]}
        >
          {summary.map((g) => {
            const base = controls.find(
              (b) => b.age === g.age && b.cycle === g.cycle,
            );
            return (
              <tr key={g.id}>
                <td>
                  {g.mixId}
                  <small>
                    {g.age} d{g.cycle === null ? "" : " · cycle " + g.cycle}
                  </small>
                </td>
                <td>{g.n}</td>
                <td>
                  {fmt(g.mean)} {g.unit}
                </td>
                <td>{fmt(g.sd)}</td>
                <td>{fmt(base?.mean)}</td>
                <td>{base ? fmt(g.mean - base.mean) : "—"}</td>
                <td>
                  {test === "potential"
                    ? "Not used"
                    : base
                      ? fmt(percentChange(g.mean, base.mean))
                      : "—"}
                </td>
              </tr>
            );
          })}
        </Table>
        <p className="small">
          Change = 100 × (group mean − control mean) / control mean. Undefined
          for zero controls. Potential comparisons use differences only. A
          control must match all selected conditions, age and cycle. These are
          descriptive comparisons, not significance tests.
        </p>
      </Panel>
      {durability && test === "potential" && (
        <CorrosionComparison
          project={project}
          phase={ph}
          method={met}
          reference={ref}
          origin={o}
          notify={notify}
        />
      )}
    </>
  );
}
function CorrosionComparison({
  project,
  phase,
  method,
  reference,
  origin,
  notify,
}: {
  project: ModuleProps["project"];
  phase: string;
  method: string;
  reference: string;
  origin: string;
  notify: (m: string) => void;
}) {
  const [control, setControl] = useState(
    project.mixes.find((m) => m.control)?.id || "",
  );
  const [exposed, setExposed] = useState("Combined chloride–sulphate");
  const [baseline, setBaseline] = useState("Chloride-free control");
  const [threshold, setThreshold] = useState(100);
  const [count, setCount] = useState(3);
  const exposures = unique(
    project.measurements.filter((r) => r.test === "potential"),
    "exposure",
  );
  let result: ReturnType<typeof corrosionRuns> = [],
    error = "";
  try {
    result = corrosionRuns(
      project.measurements.filter(
        (r) =>
          r.phase === phase &&
          r.method === method &&
          r.reference === reference &&
          r.origin === origin,
      ),
      control,
      exposed,
      baseline,
      threshold,
      count,
    );
  } catch (e) {
    error = describeError(e);
  }
  return (
    <Panel
      title="Phase-matched corrosion screening"
      description="Exploratory negative-shift persistence rule. No standard threshold or corrosion diagnosis is claimed."
    >
      <div className="form-grid cols-3">
        <Field label="Control mix">
          <select value={control} onChange={(e) => setControl(e.target.value)}>
            {project.mixes.map((m) => (
              <option key={m.id}>{m.id}</option>
            ))}
          </select>
        </Field>
        <Field label="Exposed condition">
          <select value={exposed} onChange={(e) => setExposed(e.target.value)}>
            {[...new Set([exposed, ...exposures])].map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </Field>
        <Field label="Control condition">
          <select
            value={baseline}
            onChange={(e) => setBaseline(e.target.value)}
          >
            {[...new Set([baseline, ...exposures])].map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </Field>
        <Field label="Negative shift threshold (mV)">
          <Num value={threshold} onChange={setThreshold} min={0.01} />
        </Field>
        <Field label="Consecutive cycles">
          <Num value={count} onChange={setCount} min={1} step={1} />
        </Field>
      </div>
      <ErrorBox message={error} />
      <Table
        headers={[
          "Sample / mix",
          "Matched readings",
          "Candidate run start",
          "Run completed",
        ]}
      >
        {result.map((r) => (
          <tr key={r.sampleId}>
            <td>
              {r.sampleId}
              <small>{r.mixId}</small>
            </td>
            <td>
              {r.points.filter((p) => p.controls).length}/{r.points.length}
            </td>
            <td>
              {r.first
                ? "Cycle " + r.first.cycle + " / day " + r.first.age
                : "—"}
            </td>
            <td>
              {r.confirmed
                ? "Cycle " + r.confirmed.cycle + " / day " + r.confirmed.age
                : "No qualifying run"}
            </td>
          </tr>
        ))}
      </Table>
      <p className="small">
        Controls match exact age, cycle, phase, method, origin and reference
        electrode. ΔE = exposed minus control mean. ΔE ≤ −threshold qualifies.
        Missing controls or skipped/nonqualifying cycles reset a run. Defaults
        are illustrative and require independent validation.
      </p>
      <button
        disabled={!result.length || !!error}
        onClick={() => {
          csvExport(
            "corrosion-screening.csv",
            result.flatMap((r) =>
              r.points.map((p) => ({
                sampleId: p.sampleId,
                mixId: p.mixId,
                age: p.age,
                cycle: p.cycle,
                phase: p.phase,
                exposure: p.exposure,
                reference: p.reference,
                method: p.method,
                origin: p.origin,
                deltaMV: p.delta,
                control_n: p.controls,
                run: p.run,
                thresholdMV: threshold,
                requiredCycles: count,
                controlMix: control,
                controlExposure: baseline,
              })),
            ),
          );
          notify("Screening audit exported.");
        }}
      >
        Export screening audit
      </button>
    </Panel>
  );
}
