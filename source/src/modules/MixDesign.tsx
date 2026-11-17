import { useState } from "react";
import {
  Panel,
  Field,
  Num,
  ErrorBox,
  Note,
  Stat,
  Table,
  fmt,
  describeError,
  type ModuleProps,
} from "../components/UI";
import { newMix } from "../domain/defaults";
import { mixQuantities } from "../domain/calculations";
import { now, uid, type Mix, type Material } from "../domain/types";
import { csvExport } from "../services/files";
const materials: Record<string, number> = {
  "Portland cement": 3150,
  GGBFS: 2900,
  "Glass powder": 2500,
  "Rice husk ash": 2100,
  "Sawdust ash": 2200,
  "Fly ash": 2300,
  "Metakaolin / geopolymer precursor": 2600,
  "Other SCM": 2400,
};
export default function MixDesign({ project, update, notify }: ModuleProps) {
  const [mix, setMix] = useState<Mix>(() =>
    structuredClone(project.mixes[0] || newMix()),
  );
  const [mode, setMode] = useState<"volume" | "binder">("volume");
  const [target, setTarget] = useState(7);
  const [error, setError] = useState("");
  let result: ReturnType<typeof mixQuantities> | null = null,
    validation = "";
  try {
    result = mixQuantities(mix, mode, target);
  } catch (e) {
    validation = describeError(e);
  }
  const change = (key: keyof Mix, value: unknown) =>
    setMix((m) => ({ ...m, [key]: value }));
  const material = (i: number, key: keyof Material, value: unknown) =>
    setMix((m) => ({
      ...m,
      materials: m.materials.map((a, j) =>
        j === i ? { ...a, [key]: value } : a,
      ),
    }));
  const save = () => {
    try {
      if (!mix.id.trim() || !mix.name.trim())
        throw Error("A mix ID and name are required.");
      mixQuantities(mix, mode, target);
      const saved = { ...mix, id: mix.id.trim(), updated: now() };
      update((p) => ({
        ...p,
        mixes: p.mixes.some((a) => a.id === saved.id)
          ? p.mixes.map((a) => (a.id === saved.id ? saved : a))
          : [...p.mixes, saved],
      }));
      notify("Mix recipe saved. Existing calculation snapshots are preserved.");
      setError("");
    } catch (e) {
      setError(describeError(e));
    }
  };
  return (
    <>
      <Panel
        title="Mix design calculator"
        description="Mass ratios and absolute-volume yield. All density inputs are editable assumptions."
        action={
          <select
            aria-label="Load saved mix"
            value=""
            onChange={(e) => {
              const m = project.mixes.find((m) => m.id === e.target.value);
              if (m) setMix(structuredClone(m));
            }}
          >
            <option value="">Load saved recipe…</option>
            {project.mixes.map((m) => (
              <option key={m.id}>{m.id}</option>
            ))}
          </select>
        }
      >
        <div className="form-grid">
          <Field label="Mix ID">
            <input
              value={mix.id}
              onChange={(e) => change("id", e.target.value)}
            />
          </Field>
          <Field label="Mix name">
            <input
              value={mix.name}
              onChange={(e) => change("name", e.target.value)}
            />
          </Field>
          <Field label="Calculation basis">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as typeof mode)}
            >
              <option value="volume">Target fresh volume (L)</option>
              <option value="binder">Target binder mass (kg)</option>
            </select>
          </Field>
          <Field
            label={
              mode === "volume"
                ? "Target net volume (L)"
                : "Target binder mass (kg)"
            }
          >
            <Num value={target} onChange={setTarget} min={0.001} />
          </Field>
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={mix.control}
            onChange={(e) => change("control", e.target.checked)}
          />
          Reference / control recipe
        </label>
        <div className="table-scroll">
          <table className="input-table">
            <thead>
              <tr>
                <th>Binder component</th>
                <th>Mass %</th>
                <th>Density kg/m³</th>
                <th>Role</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {mix.materials.map((a, i) => (
                <tr key={i}>
                  <td>
                    <input
                      aria-label={`Material ${i + 1} name`}
                      value={a.name}
                      onChange={(e) => material(i, "name", e.target.value)}
                    />
                  </td>
                  <td>
                    <Num
                      aria-label={`Material ${i + 1} percent`}
                      value={a.percent}
                      onChange={(v) => material(i, "percent", v)}
                      min={0}
                    />
                  </td>
                  <td>
                    <Num
                      aria-label={`Material ${i + 1} density`}
                      value={a.density}
                      onChange={(v) => material(i, "density", v)}
                      min={1}
                    />
                  </td>
                  <td>
                    <select
                      aria-label={`Material ${i + 1} role`}
                      value={a.kind}
                      onChange={(e) => material(i, "kind", e.target.value)}
                    >
                      <option value="cement">Cement</option>
                      <option value="scm">SCM</option>
                      <option value="precursor">Precursor</option>
                    </select>
                  </td>
                  <td>
                    <button
                      className="text-button"
                      onClick={() =>
                        setMix((m) => ({
                          ...m,
                          materials: m.materials.filter((_, j) => j !== i),
                        }))
                      }
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="actions">
          <select
            aria-label="Add material"
            value=""
            onChange={(e) => {
              const name = e.target.value;
              if (name)
                setMix((m) => ({
                  ...m,
                  materials: [
                    ...m.materials,
                    {
                      name,
                      percent: 0,
                      density: materials[name],
                      kind:
                        name === "Portland cement"
                          ? "cement"
                          : name.includes("precursor")
                            ? "precursor"
                            : "scm",
                    },
                  ],
                }));
            }}
          >
            <option value="">Add binder component…</option>
            {Object.keys(materials).map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
          <span className="small">
            Binder total:{" "}
            {fmt(mix.materials.reduce((s, a) => s + a.percent, 0))}%
          </span>
        </div>
        <div className="form-grid cols-3">
          {(
            [
              ["wb", "Added water / binder (kg/kg)"],
              ["sandRatio", "Sand / binder (kg/kg)"],
              ["coarseRatio", "Coarse aggregate / binder (kg/kg)"],
              ["sandDensity", "Sand density (kg/m³)"],
              ["coarseDensity", "Coarse aggregate density (kg/m³)"],
              ["air", "Assumed air (% of fresh volume)"],
              ["liquidRatio", "Additional liquid / binder (kg/kg)"],
              ["liquidDensity", "Additional liquid density (kg/m³)"],
              ["waste", "Waste allowance (%)"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <Num value={mix[key]} onChange={(v) => change(key, v)} min={0} />
            </Field>
          ))}
        </div>
        <Field label="Material assumptions and notes">
          <textarea
            value={mix.notes}
            onChange={(e) => change("notes", e.target.value)}
          />
        </Field>
        <ErrorBox message={validation || error} />
        <div className="actions">
          <button className="primary" onClick={save} disabled={!result}>
            Save recipe
          </button>
          <button
            disabled={!result}
            onClick={() => {
              if (result) {
                update((p) => ({
                  ...p,
                  calculations: [
                    {
                      id: uid(),
                      name: `${mix.id} · ${target} ${mode === "volume" ? "L" : "kg binder"}`,
                      mix: structuredClone(mix),
                      mode,
                      target,
                      created: now(),
                    },
                    ...p.calculations,
                  ],
                }));
                notify("Calculation snapshot saved with its inputs.");
              }
            }}
          >
            Save calculation
          </button>
          <button
            onClick={() =>
              setMix(
                newMix(
                  "MIX-" + String(project.mixes.length + 1).padStart(2, "0"),
                ),
              )
            }
          >
            New recipe
          </button>
        </div>
      </Panel>
      {result && (
        <>
          <div className="stats-grid">
            <Stat
              label="Binder before waste"
              value={fmt(result.binderKg) + " kg"}
            />
            <Stat
              label="Fresh yield before waste"
              value={fmt(result.volumeL) + " L"}
            />
            <Stat
              label="Total to weigh"
              value={fmt(result.totalWithWasteKg) + " kg"}
              detail={`Includes ${mix.waste}% waste`}
            />
            <Stat
              label="Cement replacement by mass"
              value={
                result.replacement === null
                  ? "N/A"
                  : fmt(result.replacement) + "%"
              }
              detail="Non-cement fraction of binder"
            />
          </div>
          <Panel
            title="Batch quantities"
            action={
              <button
                onClick={() =>
                  csvExport(
                    "mix-quantities.csv",
                    result!.items.map((i) => ({
                      ...i,
                      mixId: mix.id,
                      basis: mode,
                      target,
                      air_percent: mix.air,
                      waste_percent: mix.waste,
                      added_water_binder: mix.wb,
                      notes: mix.notes,
                    })),
                  )
                }
              >
                Download CSV
              </button>
            }
          >
            <Table headers={["Material", "Base kg", "With waste kg"]}>
              {result.items.map((a, i) => (
                <tr key={i}>
                  <td>{a.material}</td>
                  <td>{fmt(a.baseKg, 5)}</td>
                  <td>{fmt(a.withWasteKg, 5)}</td>
                </tr>
              ))}
              <tr className="total">
                <td>Total</td>
                <td>{fmt(result.totalKg, 5)}</td>
                <td>{fmt(result.totalWithWasteKg, 5)}</td>
              </tr>
            </Table>
            <p className="small">
              Implied fresh density: {fmt(result.density)} kg/m³. Yield
              including allowance: {fmt(result.volumeWithWasteL)} L.
            </p>
          </Panel>
        </>
      )}
      <Panel title="Calculation method">
        <p className="formula">
          C = Σ(fᵢ/ρᵢ) + w/b ÷ 1000 + s/b ÷ ρₛ + a/b ÷ ρₐ + l/b ÷ ρₗ
        </p>
        <p className="formula">B = (V in L ÷ 1000) × (1 − air/100) ÷ C</p>
        <p>
          Each binder component = B × fraction. Other material masses = B ×
          their mass ratio. Waste multiplies every base quantity by (1 +
          waste/100).
        </p>
        <Note>
          Dry binder fractions; SSD aggregate assumptions. Added water excludes
          water already present in an activator. For geopolymer systems, enter
          the additional activator liquid and its measured density; this tool
          does not design alkali chemistry. Verify moisture corrections, actual
          yield and constituent properties in the lab. No standard mix
          compliance is implied.
        </Note>
      </Panel>
    </>
  );
}
