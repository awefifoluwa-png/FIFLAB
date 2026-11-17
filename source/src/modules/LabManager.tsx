import { useState } from "react";
import { TESTS, uid, type Measurement, type Test } from "../domain/types";
import {
  strength,
  massChange,
  lengthChange,
  absorption,
  currentDensity,
  validateMeasurement,
} from "../domain/calculations";
import {
  Panel,
  Field,
  Num,
  ErrorBox,
  Note,
  Table,
  Badge,
  Empty,
  describeError,
  fmt,
  type ModuleProps,
} from "../components/UI";
import { csvExport, exportMeasurements } from "../services/files";
const rawFields: Partial<Record<Test, [string, string, number][]>> = {
  strength: [
    ["load", "Failure load (kN)", 100],
    ["area", "Loaded area (mm²)", 2500],
  ],
  mass: [
    ["initial", "Initial mass (g)", 1000],
    ["final", "Final mass (g)", 998],
  ],
  length: [
    ["initial", "Corrected initial reading (mm)", 0],
    ["final", "Corrected final reading (mm)", 0.1],
    ["gauge", "Gauge length (mm)", 250],
  ],
  absorption: [
    ["dry", "Oven-dry mass (g)", 1000],
    ["wet", "Saturated mass (g)", 1050],
  ],
  current: [
    ["current", "Corrosion current magnitude (µA)", 1],
    ["area", "Exposed steel area (cm²)", 10],
  ],
};
export default function LabManager({ project, update, notify }: ModuleProps) {
  const blank = (): Measurement => ({
    id: uid(),
    sampleId: "",
    mixId: project.mixes[0]?.id || "",
    test: "strength",
    value: 0,
    unit: "MPa",
    age: 28,
    date: new Date().toISOString().slice(0, 10),
    exposure: "Combined chloride–sulphate",
    phase: "dry",
    cycle: null,
    method: "Compressive test",
    reference: "",
    origin: "experimental",
    kind: "measured",
    raw: {},
    notes: "",
    datasetId: "manual",
  });
  const [m, setM] = useState<Measurement>(blank);
  const [derive, setDerive] = useState(false);
  const [raw, setRaw] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(0);
  const set = (k: keyof Measurement, v: unknown) => setM({ ...m, [k]: v });
  let val = m.value,
    validation = "";
  if (derive) {
    try {
      if (m.test === "strength") val = strength(raw.load, raw.area);
      else if (m.test === "mass") val = massChange(raw.initial, raw.final);
      else if (m.test === "length")
        val = lengthChange(raw.initial, raw.final, raw.gauge);
      else if (m.test === "absorption") val = absorption(raw.dry, raw.wet);
      else if (m.test === "current")
        val = currentDensity(raw.current, raw.area);
    } catch (e) {
      validation = describeError(e);
    }
  }
  const chooseTest = (test: Test) => {
    setM({
      ...m,
      test,
      unit: TESTS[test].unit,
      reference: test === "potential" ? "Cu/CuSO4" : "",
      method:
        test === "resistivity"
          ? "Bulk resistivity"
          : test === "potential"
            ? "Half-cell potential"
            : TESTS[test].label,
      raw: {},
    });
    setDerive(false);
    setRaw(
      Object.fromEntries((rawFields[test] || []).map(([k, , v]) => [k, v])),
    );
  };
  const save = () => {
    try {
      if (validation) throw Error(validation);
      const row = {
        ...m,
        value: val,
        kind: derive ? ("calculated" as const) : ("measured" as const),
        raw: derive ? raw : {},
      };
      validateMeasurement(
        row,
        project.mixes.map((m) => m.id),
      );
      if (
        project.measurements.some(
          (r) =>
            r.id !== row.id &&
            r.sampleId === row.sampleId &&
            r.test === row.test &&
            r.age === row.age &&
            r.cycle === row.cycle &&
            r.phase === row.phase &&
            r.method === row.method &&
            r.exposure === row.exposure &&
            r.reference === row.reference &&
            r.unit === row.unit &&
            r.origin === row.origin,
        )
      )
        throw Error(
          "A matching sample/test/age/cycle/phase record already exists. Edit it or use a distinct replicate ID.",
        );
      update((p) => ({
        ...p,
        measurements: p.measurements.some((r) => r.id === row.id)
          ? p.measurements.map((r) => (r.id === row.id ? row : r))
          : [...p.measurements, row],
      }));
      notify("Laboratory measurement saved.");
      setM({
        ...blank(),
        test: m.test,
        unit: m.unit,
        method: m.method,
        reference: m.reference,
      });
      setDerive(false);
      setError("");
    } catch (e) {
      setError(describeError(e));
    }
  };
  const rows = project.measurements.filter(
    (r) =>
      !filter ||
      [r.sampleId, r.mixId, r.exposure, TESTS[r.test].label].some((x) =>
        x.toLowerCase().includes(filter.toLowerCase()),
      ),
  );
  const shown = rows.slice(page * 40, page * 40 + 40);
  return (
    <>
      <Panel
        title="Laboratory test manager"
        description="Record a measured value or calculate a result from documented raw inputs."
      >
        <div className="form-grid cols-3">
          <Field label="Test">
            <select
              value={m.test}
              onChange={(e) => chooseTest(e.target.value as Test)}
            >
              {Object.entries(TESTS).map(([key, t]) => (
                <option key={key} value={key}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Sample / replicate ID">
            <input
              value={m.sampleId}
              onChange={(e) => set("sampleId", e.target.value)}
              placeholder="e.g. CTRL-28-R1"
            />
          </Field>
          <Field label="Mix ID">
            <select
              value={m.mixId}
              onChange={(e) => set("mixId", e.target.value)}
            >
              <option value="">Choose mix</option>
              {project.mixes.map((m) => (
                <option key={m.id}>{m.id}</option>
              ))}
            </select>
          </Field>
          <Field label="Test date">
            <input
              type="date"
              value={m.date}
              onChange={(e) => set("date", e.target.value)}
            />
          </Field>
          <Field label="Age / elapsed time (days)">
            <Num value={m.age} onChange={(n) => set("age", n)} min={0} />
          </Field>
          <Field label="Exposure condition">
            <input
              value={m.exposure}
              onChange={(e) => set("exposure", e.target.value)}
              list="exposures"
            />
            <datalist id="exposures">
              {[
                "Reference curing",
                "Chloride",
                "Sulphate",
                "Combined chloride–sulphate",
                "Wet–dry cycles",
                "Chloride-free control",
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </datalist>
          </Field>
          <Field label="Phase / condition label">
            <input
              value={m.phase}
              onChange={(e) => set("phase", e.target.value)}
              placeholder="e.g. wet / dry"
            />
          </Field>
          <Field label="Cycle number (optional)">
            <input
              type="number"
              min="0"
              step="1"
              value={m.cycle ?? ""}
              onChange={(e) =>
                set(
                  "cycle",
                  e.target.value === "" ? null : Number(e.target.value),
                )
              }
            />
          </Field>
          <Field label="Method / instrument configuration">
            <input
              value={m.method}
              onChange={(e) => set("method", e.target.value)}
              placeholder="Record test method and configuration"
            />
          </Field>
          {m.test === "potential" && (
            <Field label="Reference electrode">
              <input
                value={m.reference}
                onChange={(e) => set("reference", e.target.value)}
                placeholder="Cu/CuSO4, Ag/AgCl …"
              />
            </Field>
          )}
          <Field label="Data origin">
            <select
              value={m.origin}
              onChange={(e) => set("origin", e.target.value)}
            >
              <option value="experimental">Actual experimental entry</option>
              <option value="sample">Illustrative / sample</option>
            </select>
          </Field>
          <Field label="Units">
            <input
              value={m.unit}
              disabled={m.test !== "custom"}
              onChange={(e) => set("unit", e.target.value)}
            />
          </Field>
        </div>
        {rawFields[m.test] && (
          <label className="check">
            <input
              type="checkbox"
              checked={derive}
              onChange={(e) => {
                setDerive(e.target.checked);
                if (e.target.checked && Object.keys(raw).length === 0)
                  setRaw(
                    Object.fromEntries(
                      rawFields[m.test]!.map(([k, , v]) => [k, v]),
                    ),
                  );
              }}
            />
            Calculate from raw inputs
          </label>
        )}
        {derive ? (
          <div className="form-grid cols-3">
            {rawFields[m.test]?.map(([key, label]) => (
              <Field key={key} label={label}>
                <Num
                  value={raw[key]}
                  onChange={(n) => setRaw({ ...raw, [key]: n })}
                />
              </Field>
            ))}
          </div>
        ) : (
          <Field label={`Measured result (${m.unit || "enter units"})`}>
            <Num value={m.value} onChange={(n) => set("value", n)} />
          </Field>
        )}
        {derive && (
          <p className="formula">
            Calculated result:{" "}
            {validation ? "Invalid inputs" : fmt(val, 6) + " " + m.unit} ·{" "}
            {m.test === "strength"
              ? "f = load(kN) × 1000 / area(mm²)"
              : m.test === "mass"
                ? "Δm = 100 × (final − initial) / initial"
                : m.test === "length"
                  ? "ΔL = 100 × (corrected final − corrected initial) / gauge length"
                  : m.test === "absorption"
                    ? "A = 100 × (saturated − dry) / dry"
                    : "i = I(µA) / exposed area(cm²)"}
          </p>
        )}
        <Field label="Notes / protocol identifier">
          <textarea
            value={m.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </Field>
        <ErrorBox message={validation || error} />
        <div className="actions">
          <button className="primary" onClick={save}>
            Save measurement
          </button>
          <button
            onClick={() => {
              setM(blank());
              setDerive(false);
              setRaw({});
              setError("");
            }}
          >
            New entry
          </button>
        </div>
        <Note>
          Resistivity and chloride penetration are entered with their
          measurement method. Depth is not a diffusion coefficient. For current
          density, use a measured corrosion-current estimate and known steel
          area; applied impressed current is not automatically corrosion
          current. Potential measurements retain the reference electrode.
        </Note>
      </Panel>
      <Panel
        title="Measurement register"
        action={
          <button
            disabled={!rows.length}
            onClick={() =>
              csvExport("laboratory-data.csv", exportMeasurements(rows))
            }
          >
            Export filtered CSV
          </button>
        }
      >
        <Field label="Search register">
          <input
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(0);
            }}
            placeholder="Sample, mix, exposure or test"
          />
        </Field>
        {shown.length ? (
          <Table
            headers={[
              "Sample / mix",
              "Test",
              "Age d / cycle",
              "Result",
              "Condition / method",
              "Origin",
              "Action",
            ]}
          >
            {shown.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.sampleId}
                  <small>{r.mixId}</small>
                </td>
                <td>{TESTS[r.test].label}</td>
                <td>
                  {r.age} / {r.cycle ?? "—"}
                </td>
                <td>
                  {fmt(r.value)} {r.unit}
                  <small>{r.kind}</small>
                </td>
                <td>
                  {r.exposure}
                  <small>
                    {r.phase} · {r.method}
                    {r.reference ? " · " + r.reference : ""}
                  </small>
                </td>
                <td>
                  <Badge tone={r.origin === "sample" ? "amber" : "teal"}>
                    {r.origin}
                  </Badge>
                </td>
                <td>
                  <button
                    onClick={() => {
                      setM(structuredClone(r));
                      setRaw(r.raw);
                      setDerive(r.kind === "calculated" && !!rawFields[r.test]);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    Edit
                  </button>{" "}
                  <button
                    onClick={() => {
                      if (confirm("Remove this observation?")) {
                        update((p) => ({
                          ...p,
                          measurements: p.measurements.filter(
                            (m) => m.id !== r.id,
                          ),
                        }));
                        notify("Observation removed.");
                      }
                    }}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty>No matching measurements.</Empty>
        )}
        <div className="actions">
          <button disabled={page === 0} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span className="small">
            {rows.length ? Math.min(page * 40 + 1, rows.length) : 0}–
            {Math.min((page + 1) * 40, rows.length)} of {rows.length}
          </span>
          <button
            disabled={(page + 1) * 40 >= rows.length}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      </Panel>
    </>
  );
}
