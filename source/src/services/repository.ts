import { z } from "zod";
import type { Workspace, Project } from "../domain/types";
import {
  mixQuantities,
  batchVolume,
  validateMeasurement,
} from "../domain/calculations";
const num = z.number().finite();
const mat = z.object({
  name: z.string(),
  percent: num,
  density: num,
  kind: z.enum(["cement", "scm", "precursor"]),
});
const mix = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  control: z.boolean(),
  materials: z.array(mat),
  wb: num,
  sandRatio: num,
  coarseRatio: num,
  sandDensity: num,
  coarseDensity: num,
  liquidRatio: num,
  liquidDensity: num,
  air: num,
  waste: num,
  notes: z.string(),
  updated: z.string(),
});
const geo = z.object({
  shape: z.enum(["cube", "prism", "cylinder"]),
  length: num,
  width: num,
  height: num,
  diameter: num,
  rodDiameter: num,
  rodLength: num,
  quantity: num,
  density: num,
});
const batch = z.object({
  id: z.string(),
  group: z.string(),
  mixId: z.string(),
  purpose: z.string(),
  geometry: geo,
  ages: z.array(num),
  destructive: z.boolean(),
});
const measurement = z.object({
  id: z.string(),
  sampleId: z.string(),
  mixId: z.string(),
  test: z.enum([
    "strength",
    "mass",
    "length",
    "absorption",
    "resistivity",
    "chloride",
    "potential",
    "current",
    "custom",
  ]),
  value: num,
  unit: z.string(),
  age: num,
  date: z.string(),
  exposure: z.string(),
  phase: z.string(),
  cycle: num.nullable(),
  method: z.string(),
  reference: z.string(),
  origin: z.enum(["sample", "experimental"]),
  kind: z.enum(["measured", "calculated"]),
  raw: z.record(num),
  notes: z.string(),
  datasetId: z.string(),
});
const project = z.object({
  id: z.string(),
  name: z.string().min(1),
  researcher: z.string(),
  description: z.string(),
  created: z.string(),
  sample: z.boolean(),
  mixes: z.array(mix),
  batches: z.array(batch),
  measurements: z.array(measurement),
  datasets: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      rows: num,
      created: z.string(),
    }),
  ),
  calculations: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      mix,
      mode: z.enum(["volume", "binder"]),
      target: num,
      created: z.string(),
    }),
  ),
});
export const workspaceSchema = z.object({
  version: z.literal(1),
  projects: z.array(project).max(100),
  activeId: z.string(),
});
export function validateWorkspace(raw: unknown): Workspace {
  const state = workspaceSchema.parse(raw);
  if (
    !state.projects.length ||
    !state.projects.some((p) => p.id === state.activeId) ||
    new Set(state.projects.map((p) => p.id)).size !== state.projects.length
  )
    throw Error(
      "Backup needs projects with unique IDs and a valid active project.",
    );
  for (const p of state.projects) {
    if (new Set(p.mixes.map((m) => m.id)).size !== p.mixes.length)
      throw Error("Duplicate mix IDs.");
    if (new Set(p.measurements.map((m) => m.id)).size !== p.measurements.length)
      throw Error("Duplicate observation IDs.");
    p.mixes.forEach((m) => mixQuantities(m, "binder", 1));
    p.batches.forEach((b) => {
      if (!p.mixes.some((m) => m.id === b.mixId))
        throw Error("Batch refers to an unknown mix.");
      batchVolume(b);
    });
    p.measurements.forEach((m) =>
      validateMeasurement(
        m,
        p.mixes.map((m) => m.id),
      ),
    );
    p.calculations.forEach((c) => mixQuantities(c.mix, c.mode, c.target));
  }
  return state;
}
export interface WorkspaceRepository {
  load(): Workspace | null;
  save(state: Workspace): void;
}
export class LocalRepository implements WorkspaceRepository {
  key = "cementlab.workspace.v1";
  load() {
    const text = localStorage.getItem(this.key);
    return text ? validateWorkspace(JSON.parse(text)) : null;
  }
  save(state: Workspace) {
    localStorage.setItem(this.key, JSON.stringify(state));
  }
}
export function projectCounts(p: Project) {
  return {
    mixes: p.mixes.length,
    batches: p.batches.length,
    measurements: p.measurements.length,
    datasets: p.datasets.length,
  };
}
