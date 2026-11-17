import { useState } from "react";
import type { Geometry, Batch } from "../domain/types";
import { uid } from "../domain/types";
import { geometry } from "../domain/defaults";
import {
  specimenVolume,
  batchVolume,
  mixQuantities,
} from "../domain/calculations";
import {
  Panel,
  Field,
  Num,
  Note,
  ErrorBox,
  Stat,
  Table,
  Empty,
  fmt,
  describeError,
  type ModuleProps,
} from "../components/UI";
import { csvExport } from "../services/files";
export function GeometryFields({
  value: g,
  change,
}: {
  value: Geometry;
  change: (g: Geometry) => void;
}) {
  const set = (k: keyof Geometry, v: unknown) => change({ ...g, [k]: v });
  return (
    <div className="form-grid cols-3">
      <Field label="Shape">
        <select value={g.shape} onChange={(e) => set("shape", e.target.value)}>
          <option value="cube">Cube</option>
          <option value="prism">Rectangular prism</option>
          <option value="cylinder">Cylinder</option>
        </select>
      </Field>
      {g.shape !== "cylinder" && (
        <Field label={g.shape === "cube" ? "Side length (mm)" : "Length (mm)"}>
          <Num value={g.length} onChange={(v) => set("length", v)} min={0.1} />
        </Field>
      )}
      {g.shape === "prism" && (
        <Field label="Width (mm)">
          <Num value={g.width} onChange={(v) => set("width", v)} min={0.1} />
        </Field>
      )}
      {g.shape === "cylinder" && (
        <Field label="Diameter (mm)">
          <Num
            value={g.diameter}
            onChange={(v) => set("diameter", v)}
            min={0.1}
          />
        </Field>
      )}
      {g.shape !== "cube" && (
        <Field label="Height / depth (mm)">
          <Num value={g.height} onChange={(v) => set("height", v)} min={0.1} />
        </Field>
      )}
      <Field label="Quantity / replicates">
        <Num
          value={g.quantity}
          onChange={(v) => set("quantity", v)}
          min={1}
          step={1}
        />
      </Field>
      <Field label="Assumed fresh density (kg/m³)">
        <Num value={g.density} onChange={(v) => set("density", v)} min={1} />
      </Field>
      <Field
        label="Embedded rod diameter (mm)"
        help="Set both rod fields to zero for unreinforced specimens. Rod is parallel to height (cube: side)."
      >
        <Num
          value={g.rodDiameter}
          onChange={(v) => set("rodDiameter", v)}
          min={0}
        />
      </Field>
      <Field label="Embedded rod length (mm)">
        <Num
          value={g.rodLength}
          onChange={(v) => set("rodLength", v)}
          min={0}
        />
      </Field>
    </div>
  );
}
const presets: Record<string, Partial<Geometry>> = {
  "Compressive cube": {
    shape: "cube",
    length: 50,
    rodDiameter: 0,
    rodLength: 0,
  },
  "Sulphate prism": {
    shape: "prism",
    length: 25,
    width: 25,
    height: 285,
    rodDiameter: 0,
    rodLength: 0,
  },
  "Corrosion cylinder": {
    shape: "cylinder",
    diameter: 50,
    height: 100,
    rodDiameter: 6,
    rodLength: 80,
  },
  "Resistivity cylinder": {
    shape: "cylinder",
    diameter: 100,
    height: 200,
    rodDiameter: 0,
    rodLength: 0,
  },
  "Custom geometry": {
    shape: "prism",
    length: 100,
    width: 100,
    height: 100,
    rodDiameter: 0,
    rodLength: 0,
  },
};
export function SpecimenCalculator({ notify }: ModuleProps) {
  const [g, setG] = useState(geometry());
  let r = null,
    error = "";
  try {
    r = specimenVolume(g);
  } catch (e) {
    error = describeError(e);
  }
  return (
    <>
      <Panel
        title="Specimen volume & material estimate"
        description="Geometric estimates; presets are editable examples, not standard-approved designs."
      >
        <div className="actions">
          {Object.entries(presets).map(([name, p]) => (
            <button key={name} onClick={() => setG({ ...geometry(), ...p })}>
              {name}
            </button>
          ))}
        </div>
        <GeometryFields value={g} change={setG} />
        <ErrorBox message={error} />
      </Panel>
      {r && (
        <>
          <div className="stats-grid">
            <Stat
              label="Gross volume / specimen"
              value={fmt(r.grossL, 5) + " L"}
            />
            <Stat label="Net matrix / specimen" value={fmt(r.netL, 5) + " L"} />
            <Stat label="Total net volume" value={fmt(r.totalL, 5) + " L"} />
            <Stat
              label="Estimated matrix mass"
              value={fmt(r.estimatedKg) + " kg"}
            />
          </div>
          <Panel title="Reproduce this estimate">
            <p className="formula">
              Cube: a³ · Prism: L × W × H · Cylinder: πd²H/4
            </p>
            <p className="formula">Matrix volume = gross volume − πdᵣ²Lᵣ/4</p>
            <p>
              Dimensions in mm; divide mm³ by 1,000,000 to obtain litres.
              Multiply litres by density/1000 for kg. Steel is displaced volume,
              not part of the matrix mass.
            </p>
            <button
              onClick={() => {
                csvExport("specimen-estimate.csv", [
                  {
                    ...g,
                    ...r,
                    volume_units: "L",
                    mass_units: "kg",
                    dimensions: "mm",
                    waste_included: false,
                  },
                ]);
                notify("Specimen estimate exported.");
              }}
            >
              Export estimate CSV
            </button>
          </Panel>
        </>
      )}
      <Note>
        These estimates exclude mould losses and waste. The batch planner
        applies saved recipe waste allowances. Steel position, minimum cover,
        testing suitability and standard compliance are not checked by this
        volume calculator.
      </Note>
    </>
  );
}
export default function BatchPlanner({ project, update, notify }: ModuleProps) {
  const blank = (): Batch => ({
    id: uid(),
    group: "GROUP-" + (project.batches.length + 1),
    mixId: project.mixes[0]?.id || "",
    purpose: "Compressive strength",
    geometry: geometry(),
    ages: [7, 28, 56],
    destructive: true,
  });
  const [b, setB] = useState<Batch>(blank);
  const [ages, setAges] = useState("7, 28, 56");
  const [error, setError] = useState("");
  let result = null,
    validation = "";
  const draft = {
    ...b,
    ages: ages
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean)
      .map(Number),
  };
  try {
    result = batchVolume(draft);
  } catch (e) {
    validation = describeError(e);
  }
  const save = () => {
    try {
      batchVolume(draft);
      if (!project.mixes.some((m) => m.id === draft.mixId))
        throw Error("Save a mix recipe first, then select its ID.");
      if (
        project.batches.some(
          (a) => a.group === draft.group && a.id !== draft.id,
        )
      )
        throw Error("Group code must be unique.");
      update((p) => ({
        ...p,
        batches: p.batches.some((a) => a.id === draft.id)
          ? p.batches.map((a) => (a.id === draft.id ? draft : a))
          : [...p.batches, draft],
      }));
      notify("Experimental group saved.");
      setError("");
      setB(blank());
      setAges("7, 28, 56");
    } catch (e) {
      setError(describeError(e));
    }
  };
  const totals = project.mixes
    .map((m) => {
      const groups = project.batches.filter((b) => b.mixId === m.id);
      const V = groups.reduce((s, b) => s + batchVolume(b).totalL, 0);
      return {
        mix: m,
        volume: V,
        count: groups.reduce((s, b) => s + batchVolume(b).count, 0),
        result: V > 0 ? mixQuantities(m, "volume", V) : null,
      };
    })
    .filter((t) => t.result);
  return (
    <>
      <Panel
        title="Experimental batch planner"
        description="Save independent groups and calculate material requirements across the schedule."
      >
        <div className="form-grid">
          <Field label="Experimental group code">
            <input
              value={b.group}
              onChange={(e) => setB({ ...b, group: e.target.value })}
            />
          </Field>
          <Field label="Mix recipe">
            <select
              value={b.mixId}
              onChange={(e) => setB({ ...b, mixId: e.target.value })}
            >
              <option value="">Select mix</option>
              {project.mixes.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id}
                  {m.control ? " · control" : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Test purpose">
            <input
              value={b.purpose}
              onChange={(e) => setB({ ...b, purpose: e.target.value })}
            />
          </Field>
          <Field label="Curing / test ages (days, comma separated)">
            <input value={ages} onChange={(e) => setAges(e.target.value)} />
          </Field>
        </div>
        <GeometryFields
          value={b.geometry}
          change={(g) => setB({ ...b, geometry: g })}
        />
        <label className="check">
          <input
            type="checkbox"
            checked={b.destructive}
            onChange={(e) => setB({ ...b, destructive: e.target.checked })}
          />
          New specimens required at each age (destructive test)
        </label>
        <p className="small">
          Unchecked: the same specimens are followed at each age.{" "}
          {result &&
            `Current group: ${result.count} specimens · ${fmt(result.totalL)} L before waste.`}
        </p>
        <ErrorBox message={validation || error} />
        <div className="actions">
          <button className="primary" disabled={!result} onClick={save}>
            Save experimental group
          </button>
          <button
            onClick={() => {
              setB(blank());
              setAges("7, 28, 56");
            }}
          >
            New group
          </button>
        </div>
      </Panel>
      <Panel
        title="Saved specimen schedule"
        action={
          <button
            disabled={!project.batches.length}
            onClick={() =>
              csvExport(
                "specimen-schedule.csv",
                project.batches.map((b) => ({
                  group: b.group,
                  mixId: b.mixId,
                  purpose: b.purpose,
                  ages: b.ages.join(";"),
                  destructive: b.destructive,
                  ...b.geometry,
                  ...batchVolume(b),
                })),
              )
            }
          >
            Export schedule
          </button>
        }
      >
        {project.batches.length ? (
          <Table
            headers={[
              "Group / purpose",
              "Mix",
              "Ages (days)",
              "Specimens",
              "Matrix L",
              "Actions",
            ]}
          >
            {project.batches.map((a) => (
              <tr key={a.id}>
                <td>
                  {a.group}
                  <small>{a.purpose}</small>
                </td>
                <td>{a.mixId}</td>
                <td>{a.ages.join(", ")}</td>
                <td>{batchVolume(a).count}</td>
                <td>{fmt(batchVolume(a).totalL)}</td>
                <td className="actions">
                  <button
                    onClick={() => {
                      setB(structuredClone(a));
                      setAges(a.ages.join(", "));
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Remove this experimental group?")) {
                        update((p) => ({
                          ...p,
                          batches: p.batches.filter((b) => b.id !== a.id),
                        }));
                        notify("Group removed.");
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
          <Empty>Add a group to build your specimen schedule.</Empty>
        )}
      </Panel>
      <Panel
        title="Material requirements by mix"
        description="Net matrix volume is summed per mix. Saved mix waste is applied once to each total."
      >
        {totals.length ? (
          totals.map((t) => (
            <div key={t.mix.id} className="batch-total">
              <h3>
                {t.mix.id}{" "}
                <span className="small">
                  {t.count} specimens · {fmt(t.volume)} L net · {t.mix.waste}%
                  allowance
                </span>
              </h3>
              <div className="material-strip">
                {t.result!.items.map((i, j) => (
                  <div key={j}>
                    <span>{i.material}</span>
                    <strong>{fmt(i.withWasteKg)} kg</strong>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <Empty>
            Save a recipe and a group to calculate combined requirements.
          </Empty>
        )}
        <button
          disabled={!totals.length}
          onClick={() =>
            csvExport(
              "batch-materials.csv",
              totals.flatMap((t) =>
                t.result!.items.map((i) => ({
                  mixId: t.mix.id,
                  netVolumeL: t.volume,
                  specimens: t.count,
                  waste_percent: t.mix.waste,
                  ...i,
                })),
              ),
            )
          }
        >
          Export material quantities
        </button>
      </Panel>
    </>
  );
}
