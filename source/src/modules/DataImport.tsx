import { useState } from "react";
import {
  readFile,
  importRows,
  measureColumns,
  csvExport,
} from "../services/files";
import { uid, now, TESTS, type Measurement } from "../domain/types";
import {
  Panel,
  Field,
  ErrorBox,
  Note,
  Table,
  describeError,
  type ModuleProps,
} from "../components/UI";
export default function DataImport({ project, update, notify }: ModuleProps) {
  const [fileName, setFileName] = useState("");
  const [sheets, setSheets] = useState<
    { name: string; rows: Record<string, unknown>[] }[]
  >([]);
  const [sheet, setSheet] = useState(0);
  const [preview, setPreview] = useState<Measurement[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [datasetId, setDatasetId] = useState(uid());
  const validate = () => {
    try {
      const r = importRows(
        sheets[sheet].rows,
        project.mixes.map((m) => m.id),
        datasetId,
      );
      const keys = new Set<string>();
      for (const row of r) {
        const k = JSON.stringify([
          row.sampleId,
          row.test,
          row.age,
          row.cycle,
          row.phase,
          row.exposure,
          row.method,
          row.reference,
          row.unit,
          row.origin,
        ]);
        if (keys.has(k))
          throw Error(
            "Duplicate observation identity within import. Use unique sample/replicate IDs.",
          );
        keys.add(k);
        if (
          project.measurements.some(
            (m) =>
              JSON.stringify([
                m.sampleId,
                m.test,
                m.age,
                m.cycle,
                m.phase,
                m.exposure,
                m.method,
                m.reference,
                m.unit,
                m.origin,
              ]) === k,
          )
        )
          throw Error(
            `Observation ${row.sampleId} is already present. Edit it in the register or use distinct replicate IDs.`,
          );
      }
      setPreview(r);
      setError("");
      notify(`${r.length} rows validated. Review before importing.`);
    } catch (e) {
      setPreview([]);
      setError(describeError(e));
    }
  };
  return (
    <>
      <Panel
        title="Import research data"
        description="Tidy CSV or Excel (.xlsx). Every row is validated before anything is saved."
      >
        <Field label="Choose CSV or Excel workbook">
          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setBusy(true);
              try {
                const r = await readFile(f);
                setSheets(r.sheets);
                setFileName(f.name);
                setSheet(0);
                setPreview([]);
                setDatasetId(uid());
                setError("");
              } catch (e) {
                setError(describeError(e));
              } finally {
                setBusy(false);
                e.target.value = "";
              }
            }}
          />
        </Field>
        {busy && <p role="status">Reading workbook…</p>}
        {sheets.length > 0 && (
          <>
            <Field label="Worksheet">
              <select
                value={sheet}
                onChange={(e) => {
                  setSheet(Number(e.target.value));
                  setPreview([]);
                }}
              >
                {sheets.map((s, i) => (
                  <option value={i} key={i}>
                    {s.name} · {s.rows.length} rows
                  </option>
                ))}
              </select>
            </Field>
            <button className="primary" onClick={validate}>
              Validate selected sheet
            </button>
          </>
        )}
        <ErrorBox message={error} />
        {preview.length > 0 && (
          <>
            <p>
              {preview.length} validated rows from {fileName} /{" "}
              {sheets[sheet]?.name}. Preview shows the first 8.
            </p>
            <Table
              headers={[
                "Sample",
                "Mix",
                "Test",
                "Value / unit",
                "Age",
                "Origin",
              ]}
            >
              {preview.slice(0, 8).map((r) => (
                <tr key={r.id}>
                  <td>{r.sampleId}</td>
                  <td>{r.mixId}</td>
                  <td>{r.test}</td>
                  <td>
                    {r.value} {r.unit}
                  </td>
                  <td>{r.age}</td>
                  <td>{r.origin}</td>
                </tr>
              ))}
            </Table>
            <button
              className="primary"
              onClick={() => {
                update((p) => ({
                  ...p,
                  measurements: [...p.measurements, ...preview],
                  datasets: [
                    {
                      id: datasetId,
                      name: fileName + " / " + sheets[sheet].name,
                      rows: preview.length,
                      created: now(),
                    },
                    ...p.datasets,
                  ],
                }));
                notify("Dataset imported successfully.");
                setPreview([]);
                setSheets([]);
              }}
            >
              Import validated rows
            </button>
          </>
        )}
      </Panel>
      <Panel title="Required data format">
        <p>
          Save the mix recipes first. Each data row must use one of their exact
          mix IDs:{" "}
          {project.mixes.map((m) => m.id).join(", ") || "none saved yet"}.
        </p>
        <code className="code-block">{measureColumns.join(",")}</code>
        <p className="small">
          Required: sampleId, mixId, test, value, unit, age, date, exposure,
          method. phase and reference can be blank, except reference is required
          for potential. cycle is optional. origin defaults to experimental and
          kind to measured if omitted. Dates use YYYY-MM-DD. Extra columns are
          ignored; rawInputs accepts a JSON object of numeric inputs.
        </p>
        <p className="small">
          Test codes: {Object.keys(TESTS).join(", ")}. Do not mix units or
          measurement configurations. Sample data must use origin=sample.
        </p>
        <div className="actions">
          <button
            onClick={() =>
              csvExport("measurement-template.csv", [
                Object.fromEntries(measureColumns.map((c) => [c, ""])),
              ])
            }
          >
            Download blank CSV template
          </button>
          <button
            onClick={() =>
              csvExport("measurement-example.csv", [
                {
                  sampleId: "EXAMPLE-R1",
                  mixId: project.mixes[0]?.id || "CTRL",
                  test: "strength",
                  value: 40,
                  unit: "MPa",
                  age: 28,
                  date: "2026-01-01",
                  exposure: "Reference curing",
                  phase: "",
                  cycle: "",
                  method: "Illustrative measurement",
                  reference: "",
                  origin: "sample",
                  kind: "measured",
                  notes: "Synthetic example only",
                },
              ])
            }
          >
            Download example row
          </button>
        </div>
        <Note>
          Import is all-or-nothing. Invalid values are not silently discarded.
          Formula cells in Excel require a cached result; this app does not
          recalculate Excel formulas. Maximum 10 MB and 10,000 rows per import.
        </Note>
      </Panel>
    </>
  );
}
