import {
  uid,
  now,
  type Mix,
  type Project,
  type Geometry,
  type Measurement,
} from "./types";
export function newMix(id = "MIX-01"): Mix {
  return {
    id,
    name: "Custom cementitious mix",
    control: false,
    materials: [
      { name: "Portland cement", percent: 100, density: 3150, kind: "cement" },
    ],
    wb: 0.45,
    sandRatio: 2.75,
    coarseRatio: 0,
    sandDensity: 2650,
    coarseDensity: 2700,
    liquidRatio: 0,
    liquidDensity: 1200,
    air: 2,
    waste: 10,
    notes:
      "Illustrative density assumptions; replace with measured material properties. SSD aggregate basis; no moisture correction.",
    updated: now(),
  };
}
export const geometry = (): Geometry => ({
  shape: "cube",
  length: 50,
  width: 25,
  height: 285,
  diameter: 50,
  rodDiameter: 0,
  rodLength: 0,
  quantity: 3,
  density: 2200,
});
export function newProject(name = "Untitled research project"): Project {
  return {
    id: uid(),
    name,
    researcher: "",
    description: "",
    created: now(),
    sample: false,
    mixes: [],
    batches: [],
    measurements: [],
    datasets: [],
    calculations: [],
  };
}
export function exampleProject(): Project {
  const p = newProject("Coupled chloride–sulphate exposure");
  p.sample = true;
  p.researcher = "Illustrative research project";
  p.description =
    "Coupled Chloride–Sulphate Exposure and Corrosion Initiation in Low-Clinker Slag–Glass Powder Cementitious Materials. All records in this example are synthetic, not experimental findings.";
  const recipes = [
    ["CTRL", 100, 0, 0],
    ["SL50", 50, 50, 0],
    ["GP25", 75, 0, 25],
    ["SL25-GP25", 50, 25, 25],
  ] as const;
  p.mixes = recipes.map(([id, c, s, g]) => ({
    ...newMix(id),
    name:
      id === "CTRL"
        ? "Control binder"
        : id === "SL50"
          ? "Slag-modified binder"
          : id === "GP25"
            ? "Glass powder binder"
            : "Combined slag–glass binder",
    control: id === "CTRL",
    materials: [
      {
        name: "Portland cement",
        percent: c,
        density: 3150,
        kind: "cement" as const,
      },
      { name: "GGBFS", percent: s, density: 2900, kind: "scm" as const },
      { name: "Glass powder", percent: g, density: 2500, kind: "scm" as const },
    ],
  }));
  p.batches = p.mixes.map((m) => ({
    id: uid(),
    group: m.id + "-STR",
    mixId: m.id,
    purpose: "Strength at selected ages",
    geometry: geometry(),
    ages: [7, 28, 56],
    destructive: true,
  }));
  const add = (m: Measurement) => p.measurements.push(m);
  p.mixes.forEach((m, i) => {
    [7, 28, 56].forEach((age, j) => {
      [1, 2, 3].forEach((rep) => {
        for (const test of [
          "strength",
          "mass",
          "resistivity",
          "current",
        ] as const) {
          const unit = {
            strength: "MPa",
            mass: "%",
            resistivity: "kΩ·cm",
            current: "µA/cm²",
          }[test];
          const value =
            test === "strength"
              ? 22 + j * 10 + i * 1.7 + (rep - 2) * 1.2
              : test === "mass"
                ? -0.15 * j - 0.03 * i + (rep - 2) * 0.01
                : test === "resistivity"
                  ? 10 + j * 7 + i * 3 + (rep - 2) * 0.5
                  : 0.12 + j * 0.09 + i * 0.01 + (rep - 2) * 0.015;
          add({
            id: uid(),
            sampleId: `${m.id}-${test}-${age}-${rep}`,
            mixId: m.id,
            test,
            value,
            unit,
            age,
            date: "2026-01-01",
            exposure: "Combined chloride–sulphate",
            phase: "dry",
            cycle: j + 1,
            method:
              test === "resistivity"
                ? "Bulk resistivity"
                : test === "current"
                  ? "Direct current density"
                  : "Illustrative measurement",
            reference: "",
            origin: "sample",
            kind: "measured",
            raw: {},
            notes: "Synthetic example; no material ranking is implied.",
            datasetId: "sample",
          });
        }
      });
    });
    for (let cycle = 1; cycle <= 6; cycle++)
      for (const phase of ["wet", "dry"])
        for (const rep of [1, 2])
          for (const exposure of [
            "Combined chloride–sulphate",
            "Chloride-free control",
          ]) {
            const base = -110 - cycle * 4 + (phase === "wet" ? -20 : 0);
            const shift =
              exposure === "Chloride-free control"
                ? 0
                : cycle < 3
                  ? -15
                  : -65 - cycle * 13 - i * 5;
            add({
              id: uid(),
              sampleId: `${m.id}-P-${rep}`,
              mixId: m.id,
              test: "potential",
              value: base + shift + (rep - 1.5) * 4,
              unit: "mV",
              age: cycle * 7,
              date: "2026-01-01",
              exposure,
              phase,
              cycle,
              method: "Half-cell potential",
              reference: "Cu/CuSO4",
              origin: "sample",
              kind: "measured",
              raw: {},
              notes: "Synthetic corrosion monitoring example.",
              datasetId: "sample",
            });
          }
    for (const exposure of ["Chloride", "Sulphate", "Wet–dry cycles"])
      for (const rep of [1, 2])
        add({
          id: uid(),
          sampleId: `${m.id}-${exposure}-${rep}`,
          mixId: m.id,
          test: "mass",
          value: -0.1 - i * 0.03 + (rep - 1.5) * 0.02,
          unit: "%",
          age: 28,
          date: "2026-01-01",
          exposure,
          phase: "dry",
          cycle: 4,
          method: "Illustrative measurement",
          reference: "",
          origin: "sample",
          kind: "measured",
          raw: {},
          notes: "Synthetic example.",
          datasetId: "sample",
        });
  });
  p.datasets = [
    {
      id: "sample",
      name: "Built-in synthetic example",
      rows: p.measurements.length,
      created: now(),
    },
  ];
  return p;
}
