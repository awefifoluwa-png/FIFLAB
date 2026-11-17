import {
  TESTS,
  type Mix,
  type Geometry,
  type Batch,
  type Measurement,
} from "./types";
export const finite = (x: number, name: string, min = 0) => {
  if (!Number.isFinite(x) || x < min)
    throw Error(`${name} must be a finite number ≥ ${min}.`);
  return x;
};
export const positive = (x: number, name: string) => {
  finite(x, name);
  if (x === 0) throw Error(`${name} must be greater than zero.`);
  return x;
};
export function mixQuantities(
  m: Mix,
  mode: "volume" | "binder",
  target: number,
) {
  positive(target, "Batch target");
  if (!m.materials.length) throw Error("Add at least one binder component.");
  let fraction = 0,
    coefficient = 0;
  for (const a of m.materials) {
    if (!a.name.trim()) throw Error("Every material needs a name.");
    finite(a.percent, "Material percentage");
    positive(a.density, "Material density");
    fraction += a.percent;
    coefficient += a.percent / 100 / a.density;
  }
  if (Math.abs(fraction - 100) > 0.000001)
    throw Error(
      `Binder percentages must total 100%; currently ${fraction.toFixed(3)}%.`,
    );
  for (const [name, v] of Object.entries({
    waterBinder: m.wb,
    sandRatio: m.sandRatio,
    coarseRatio: m.coarseRatio,
    liquidRatio: m.liquidRatio,
    air: m.air,
    waste: m.waste,
  }))
    finite(v, name);
  if (m.air >= 100) throw Error("Air fraction must be less than 100%.");
  if (m.waste > 100) throw Error("Waste allowance must not exceed 100%.");
  positive(m.sandDensity, "Sand density");
  positive(m.coarseDensity, "Coarse aggregate density");
  positive(m.liquidDensity, "Additional liquid density");
  coefficient +=
    m.wb / 1000 +
    m.sandRatio / m.sandDensity +
    m.coarseRatio / m.coarseDensity +
    m.liquidRatio / m.liquidDensity;
  positive(coefficient, "Absolute-volume coefficient");
  const B =
    mode === "binder"
      ? target
      : ((target / 1000) * (1 - m.air / 100)) / coefficient;
  positive(B, "Calculated binder mass");
  const volume = ((B * coefficient) / (1 - m.air / 100)) * 1000;
  positive(volume, "Calculated volume");
  const items = [
    ...m.materials.map((a) => ({
      material: a.name,
      baseKg: (B * a.percent) / 100,
    })),
    { material: "Added water", baseKg: B * m.wb },
    { material: "Sand (SSD basis)", baseKg: B * m.sandRatio },
    { material: "Coarse aggregate (SSD basis)", baseKg: B * m.coarseRatio },
    { material: "Additional liquid / activator", baseKg: B * m.liquidRatio },
  ].map((i) => ({ ...i, withWasteKg: i.baseKg * (1 + m.waste / 100) }));
  const total = items.reduce((s, a) => s + a.baseKg, 0);
  positive(total, "Total batch mass");
  finite(total * (1 + m.waste / 100), "Total mass including waste");
  return {
    binderKg: B,
    volumeL: volume,
    items,
    totalKg: total,
    totalWithWasteKg: total * (1 + m.waste / 100),
    volumeWithWasteL: volume * (1 + m.waste / 100),
    coefficient,
    density: total / (volume / 1000),
    replacement: m.materials.some((a) => a.kind === "cement" && a.percent > 0)
      ? 100 -
        m.materials
          .filter((a) => a.kind === "cement")
          .reduce((s, a) => s + a.percent, 0)
      : null,
  };
}
export function specimenVolume(g: Geometry) {
  if (!Number.isInteger(g.quantity) || g.quantity < 1 || g.quantity > 100000)
    throw Error("Specimen quantity must be a whole number from 1 to 100,000.");
  positive(g.density, "Assumed fresh density");
  let mm3: number;
  if (g.shape === "cube") {
    positive(g.length, "Cube side");
    mm3 = g.length ** 3;
  } else if (g.shape === "prism") {
    positive(g.length, "Length");
    positive(g.width, "Width");
    positive(g.height, "Height");
    mm3 = g.length * g.width * g.height;
  } else {
    positive(g.diameter, "Diameter");
    positive(g.height, "Height");
    mm3 = (Math.PI * g.diameter ** 2 * g.height) / 4;
  }
  finite(g.rodDiameter, "Rod diameter");
  finite(g.rodLength, "Rod embedded length");
  if ((g.rodDiameter === 0) !== (g.rodLength === 0))
    throw Error(
      "Specify both rod diameter and embedded length, or set both to zero.",
    );
  if (g.rodDiameter > 0) {
    const maxWidth =
      g.shape === "cylinder"
        ? g.diameter
        : g.shape === "cube"
          ? g.length
          : Math.min(g.length, g.width);
    const maxLength = g.shape === "cube" ? g.length : g.height;
    if (g.rodDiameter >= maxWidth || g.rodLength > maxLength)
      throw Error(
        "Embedded rod must fit inside the specimen; check diameter and length.",
      );
  }
  positive(mm3, "Calculated specimen volume");
  const steel = (Math.PI * g.rodDiameter ** 2 * g.rodLength) / 4;
  const netL = (mm3 - steel) / 1e6;
  positive(netL, "Net matrix volume");
  finite(netL * g.quantity, "Total matrix volume");
  finite((netL / 1000) * g.density * g.quantity, "Estimated mass");
  return {
    grossL: mm3 / 1e6,
    steelL: steel / 1e6,
    netL,
    totalL: netL * g.quantity,
    estimatedKg: (netL / 1000) * g.density * g.quantity,
  };
}
export function batchVolume(b: Batch) {
  if (!b.group.trim() || !b.purpose.trim())
    throw Error("Group code and test purpose are required.");
  if (
    !b.ages.length ||
    b.ages.some((x) => !Number.isFinite(x) || x < 0) ||
    new Set(b.ages).size !== b.ages.length
  )
    throw Error("Enter unique nonnegative curing ages.");
  const g = specimenVolume(b.geometry);
  const factor = b.destructive ? b.ages.length : 1;
  return {
    ...g,
    totalL: g.totalL * factor,
    count: b.geometry.quantity * factor,
    estimatedKg: g.estimatedKg * factor,
  };
}
export function sampleStats(a: number[]) {
  if (!a.length) throw Error("Statistics require at least one value.");
  a.forEach((v) => finite(v, "Observation", -Number.MAX_VALUE));
  const mean = a.reduce((s, x) => s + x, 0) / a.length;
  const sd =
    a.length > 1
      ? Math.sqrt(a.reduce((s, x) => s + (x - mean) ** 2, 0) / (a.length - 1))
      : null;
  return { n: a.length, mean, sd, min: Math.min(...a), max: Math.max(...a) };
}
export function percentChange(value: number, baseline: number) {
  if (!Number.isFinite(value) || !Number.isFinite(baseline))
    throw Error("Change requires finite values.");
  return baseline === 0 ? null : ((value - baseline) / baseline) * 100;
}
export const strength = (loadKN: number, areaMM2: number) =>
  (positive(loadKN, "Failure load") * 1000) / positive(areaMM2, "Loaded area");
export const massChange = (initial: number, final: number) =>
  ((finite(final, "Final mass") - positive(initial, "Initial mass")) /
    initial) *
  100;
export const lengthChange = (initial: number, final: number, gauge: number) =>
  ((finite(final, "Corrected final reading", -1e12) -
    finite(initial, "Corrected initial reading", -1e12)) /
    positive(gauge, "Gauge length")) *
  100;
export const absorption = (dry: number, wet: number) => {
  positive(dry, "Dry mass");
  positive(wet, "Saturated mass");
  if (wet < dry) throw Error("Saturated mass must be at least the dry mass.");
  return ((wet - dry) / dry) * 100;
};
export const currentDensity = (currentUA: number, areaCM2: number) =>
  finite(currentUA, "Current magnitude") /
  positive(areaCM2, "Exposed steel area");
export function validateMeasurement(m: Measurement, mixIds: string[]) {
  if (!mixIds.includes(m.mixId)) throw Error("Choose a saved mix ID.");
  if (
    !m.sampleId.trim() ||
    !m.exposure.trim() ||
    !m.unit.trim() ||
    !m.method.trim()
  )
    throw Error("Sample ID, exposure, method and units are required.");
  if (m.test !== "custom" && m.unit !== TESTS[m.test].unit)
    throw Error(
      `Use ${TESTS[m.test].unit} for ${TESTS[m.test].label}; convert other units before import.`,
    );
  finite(m.value, "Measurement value", -1e12);
  finite(m.age, "Age (days)");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(m.date) ||
    Number.isNaN(Date.parse(m.date)) ||
    new Date(m.date).toISOString().slice(0, 10) !== m.date
  )
    throw Error("Enter a valid test date.");
  if (m.cycle !== null && (!Number.isInteger(m.cycle) || m.cycle < 0))
    throw Error("Cycle must be a nonnegative integer or blank.");
  if (m.test === "potential" && !m.reference.trim())
    throw Error("Enter the reference electrode for potential measurements.");
  if (
    ["strength", "absorption", "resistivity", "chloride", "current"].includes(
      m.test,
    ) &&
    m.value < 0
  )
    throw Error("This test value cannot be negative.");
  if (
    !["sample", "experimental"].includes(m.origin) ||
    !["measured", "calculated"].includes(m.kind)
  )
    throw Error("Invalid data provenance.");
  return m;
}
export function groupStats(data: Measurement[]) {
  const map = new Map<string, Measurement[]>();
  for (const r of data) {
    const key = JSON.stringify([
      r.mixId,
      r.test,
      r.age,
      r.unit,
      r.exposure,
      r.phase,
      r.method,
      r.reference,
      r.origin,
      r.cycle,
    ]);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return [...map.values()]
    .map((rows) => ({
      ...rows[0],
      ...sampleStats(rows.map((r) => r.value)),
      id: JSON.stringify([
        rows[0].mixId,
        rows[0].age,
        rows[0].phase,
        rows[0].cycle,
      ]),
    }))
    .sort((a, b) => a.age - b.age || a.mixId.localeCompare(b.mixId));
}
export function corrosionRuns(
  data: Measurement[],
  controlId: string,
  exposedExposure: string,
  controlExposure: string,
  threshold: number,
  persistence: number,
) {
  positive(threshold, "Negative shift threshold");
  if (!Number.isInteger(persistence) || persistence < 1)
    throw Error("Persistence must be a positive integer.");
  const exposed = data.filter(
    (r) =>
      r.test === "potential" &&
      r.mixId !== controlId &&
      r.exposure === exposedExposure,
  );
  const controls = data.filter(
    (r) =>
      r.test === "potential" &&
      r.mixId === controlId &&
      r.exposure === controlExposure,
  );
  return [...new Set(exposed.map((r) => r.sampleId))].map((id) => {
    const rows = exposed
      .filter((r) => r.sampleId === id)
      .sort((a, b) => (a.cycle ?? -1) - (b.cycle ?? -1));
    let previous: number | null = null,
      run: Measurement[] = [],
      first: Measurement | null = null,
      confirmed: Measurement | null = null;
    const points = rows.map((r) => {
      const c = controls.filter(
        (c) =>
          c.age === r.age &&
          c.cycle === r.cycle &&
          c.phase === r.phase &&
          c.reference === r.reference &&
          c.unit === r.unit &&
          c.method === r.method &&
          c.origin === r.origin,
      );
      const delta = c.length
        ? r.value - sampleStats(c.map((c) => c.value)).mean
        : null;
      const qualifies =
        delta !== null && delta <= -threshold && r.cycle !== null;
      if (!qualifies || previous === null || r.cycle !== previous + 1) run = [];
      if (qualifies) run.push(r);
      if (run.length === persistence && !confirmed) {
        first = run[0];
        confirmed = r;
      }
      previous = r.cycle;
      return { ...r, delta, controls: c.length, run: run.length };
    });
    return {
      sampleId: id,
      mixId: rows[0].mixId,
      first: first as Measurement | null,
      confirmed: confirmed as Measurement | null,
      points,
    };
  });
}
