export type Material = {
  name: string;
  percent: number;
  density: number;
  kind: "cement" | "scm" | "precursor";
};
export type Mix = {
  id: string;
  name: string;
  control: boolean;
  materials: Material[];
  wb: number;
  sandRatio: number;
  coarseRatio: number;
  sandDensity: number;
  coarseDensity: number;
  liquidRatio: number;
  liquidDensity: number;
  air: number;
  waste: number;
  notes: string;
  updated: string;
};
export type Geometry = {
  shape: "cube" | "prism" | "cylinder";
  length: number;
  width: number;
  height: number;
  diameter: number;
  rodDiameter: number;
  rodLength: number;
  quantity: number;
  density: number;
};
export type Batch = {
  id: string;
  group: string;
  mixId: string;
  purpose: string;
  geometry: Geometry;
  ages: number[];
  destructive: boolean;
};
export const TESTS = {
  strength: { label: "Compressive strength", unit: "MPa" },
  mass: { label: "Mass change", unit: "%" },
  length: { label: "Length change", unit: "%" },
  absorption: { label: "Water absorption", unit: "%" },
  resistivity: { label: "Electrical resistivity", unit: "kΩ·cm" },
  chloride: { label: "Chloride penetration depth", unit: "mm" },
  potential: { label: "Corrosion potential", unit: "mV" },
  current: { label: "Corrosion current density", unit: "µA/cm²" },
  custom: { label: "Custom measurement", unit: "" },
} as const;
export type Test = keyof typeof TESTS;
export type Measurement = {
  id: string;
  sampleId: string;
  mixId: string;
  test: Test;
  value: number;
  unit: string;
  age: number;
  date: string;
  exposure: string;
  phase: string;
  cycle: number | null;
  method: string;
  reference: string;
  origin: "sample" | "experimental";
  kind: "measured" | "calculated";
  raw: Record<string, number>;
  notes: string;
  datasetId: string;
};
export type Dataset = {
  id: string;
  name: string;
  rows: number;
  created: string;
};
export type Calculation = {
  id: string;
  name: string;
  mix: Mix;
  mode: "volume" | "binder";
  target: number;
  created: string;
};
export type Project = {
  id: string;
  name: string;
  researcher: string;
  description: string;
  created: string;
  sample: boolean;
  mixes: Mix[];
  batches: Batch[];
  measurements: Measurement[];
  datasets: Dataset[];
  calculations: Calculation[];
};
export type Workspace = { version: 1; projects: Project[]; activeId: string };
export const uid = () => crypto.randomUUID();
export const now = () => new Date().toISOString();
