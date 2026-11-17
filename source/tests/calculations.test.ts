import { describe, it, expect } from "vitest";
import {
  mixQuantities,
  specimenVolume,
  batchVolume,
  sampleStats,
  percentChange,
  strength,
  massChange,
  lengthChange,
  absorption,
  currentDensity,
  corrosionRuns,
  groupStats,
  validateMeasurement,
} from "../src/domain/calculations";
import { newMix, geometry, exampleProject } from "../src/domain/defaults";
import type { Measurement } from "../src/domain/types";
import { validateWorkspace } from "../src/services/repository";
const recipe = () => ({
  ...newMix("M"),
  materials: [
    { name: "cement", kind: "cement" as const, percent: 50, density: 2000 },
    { name: "slag", kind: "scm" as const, percent: 50, density: 2000 },
  ],
  wb: 0.5,
  sandRatio: 2,
  sandDensity: 2000,
  coarseRatio: 0,
  liquidRatio: 0,
  air: 0,
  waste: 10,
});
describe("Independent mix-design checks", () => {
  it("10 L uses 5 kg binder: C=0.002 m³/kg, waste scales once", () => {
    const r = mixQuantities(recipe(), "volume", 10);
    expect(r.binderKg).toBeCloseTo(5, 12);
    expect(r.items[0].baseKg).toBe(2.5);
    expect(r.items[2].baseKg).toBe(2.5);
    expect(r.totalKg).toBe(17.5);
    expect(r.totalWithWasteKg).toBeCloseTo(19.25, 12);
    expect(r.replacement).toBe(50);
    expect(r.volumeWithWasteL).toBe(11);
  });
  it("air occupies 10% of gross target; binder=4.5 kg", () =>
    expect(
      mixQuantities({ ...recipe(), air: 10 }, "volume", 10).binderKg,
    ).toBeCloseTo(4.5, 12));
  it("additional liquid is counted in mass and volume", () => {
    const r = mixQuantities(
      { ...recipe(), liquidRatio: 0.2, liquidDensity: 1000 },
      "binder",
      5,
    );
    expect(r.volumeL).toBeCloseTo(11, 12);
    expect(r.totalKg).toBe(18.5);
  });
  it("no Portland fraction gives no Portland replacement claim", () =>
    expect(
      mixQuantities(
        {
          ...recipe(),
          materials: [
            { name: "ash", kind: "precursor", percent: 100, density: 2000 },
          ],
        },
        "binder",
        1,
      ).replacement,
    ).toBeNull());
  it("rejects invalid fractions, air and densities", () => {
    expect(() =>
      mixQuantities(
        {
          ...recipe(),
          materials: [
            { name: "c", kind: "cement", percent: 90, density: 3000 },
          ],
        },
        "binder",
        1,
      ),
    ).toThrow(/100/);
    expect(() =>
      mixQuantities({ ...recipe(), air: 100 }, "volume", 1),
    ).toThrow();
    expect(() =>
      mixQuantities({ ...recipe(), sandDensity: 0 }, "binder", 1),
    ).toThrow();
    expect(() => mixQuantities(recipe(), "volume", NaN)).toThrow();
  });
});
describe("Specimens and schedules", () => {
  it("three 50 mm cubes total 0.375 L and 0.825 kg at 2200 kg/m³", () => {
    const v = specimenVolume(geometry());
    expect(v.totalL).toBe(0.375);
    expect(v.estimatedKg).toBeCloseTo(0.825, 12);
  });
  it("100x200 cylinder volume=pi/2 L", () =>
    expect(
      specimenVolume({
        ...geometry(),
        shape: "cylinder",
        diameter: 100,
        height: 200,
        quantity: 1,
      }).grossL,
    ).toBeCloseTo(Math.PI / 2, 12));
  it("25x25x285 prism=0.178125 L", () =>
    expect(
      specimenVolume({
        ...geometry(),
        shape: "prism",
        length: 25,
        width: 25,
        height: 285,
        quantity: 1,
      }).netL,
    ).toBeCloseTo(0.178125, 12));
  it("steel displacement: pi*6²*80/4 mm³ is subtracted", () => {
    const v = specimenVolume({
      ...geometry(),
      shape: "cylinder",
      diameter: 50,
      height: 100,
      rodDiameter: 6,
      rodLength: 80,
      quantity: 1,
    });
    expect(v.steelL).toBeCloseTo(0.002261946710584651, 12);
    expect(v.netL).toBeCloseTo(0.1940875941387774, 12);
  });
  it("destructive ages multiply specimen count; repeated monitoring does not", () => {
    const b = {
      id: "x",
      group: "G",
      mixId: "M",
      purpose: "test",
      geometry: geometry(),
      ages: [7, 28, 56],
      destructive: true,
    };
    expect(batchVolume(b).count).toBe(9);
    expect(batchVolume(b).totalL).toBe(1.125);
    expect(batchVolume({ ...b, destructive: false }).count).toBe(3);
  });
  it("rejects out-of-spec geometry and duplicate ages", () => {
    expect(() => specimenVolume({ ...geometry(), quantity: 1.5 })).toThrow();
    expect(() =>
      specimenVolume({ ...geometry(), rodDiameter: 60, rodLength: 40 }),
    ).toThrow();
    expect(() =>
      batchVolume({
        id: "x",
        group: "g",
        mixId: "m",
        purpose: "p",
        geometry: geometry(),
        ages: [28, 28],
        destructive: true,
      }),
    ).toThrow();
  });
});
describe("Measured-to-calculated conversions", () => {
  it("100 kN / 2500 mm² = 40 MPa", () => expect(strength(100, 2500)).toBe(40));
  it("mass loss 1000 to 995 g = -0.5%", () =>
    expect(massChange(1000, 995)).toBe(-0.5));
  it("0.25 mm change / 250 mm gauge = 0.1%", () =>
    expect(lengthChange(0, 0.25, 250)).toBe(0.1));
  it("1000 to 1050 g absorption = 5%", () =>
    expect(absorption(1000, 1050)).toBe(5));
  it("2 uA / 10 cm² = 0.2 uA/cm²", () =>
    expect(currentDensity(2, 10)).toBe(0.2));
  it("rejects zero divisors and implausible absorption input", () => {
    expect(() => strength(100, 0)).toThrow();
    expect(() => absorption(1000, 900)).toThrow();
    expect(() => lengthChange(0, 1, 0)).toThrow();
  });
});
const row = (over: Partial<Measurement> = {}): Measurement => ({
  id: crypto.randomUUID(),
  sampleId: "S",
  mixId: "M",
  test: "potential",
  value: -220,
  unit: "mV",
  age: 7,
  date: "2026-01-01",
  exposure: "combined",
  phase: "dry",
  cycle: 1,
  method: "half cell",
  reference: "CSE",
  origin: "experimental",
  kind: "measured",
  raw: {},
  notes: "",
  datasetId: "test",
  ...over,
});
describe("Statistics and comparison provenance", () => {
  it("mean=12 and sample SD=2 for 10,12,14", () => {
    const s = sampleStats([10, 12, 14]);
    expect(s.mean).toBe(12);
    expect(s.sd).toBe(2);
  });
  it("n=1 SD is not estimable; zero baseline change undefined", () => {
    expect(sampleStats([4]).sd).toBeNull();
    expect(percentChange(5, 0)).toBeNull();
    expect(percentChange(45, 30)).toBe(50);
  });
  it("methods, reference, phase, origin and cycle cannot be pooled", () => {
    expect(
      groupStats([
        row(),
        row({ reference: "AgCl" }),
        row({ origin: "sample" }),
        row({ method: "different" }),
        row({ phase: "wet" }),
        row({ cycle: 2 }),
      ]),
    ).toHaveLength(6);
  });
  it("unit and date validation prevents incorrect interpretation", () => {
    expect(() => validateMeasurement(row({ unit: "V" }), ["M"])).toThrow(/mV/);
    expect(() =>
      validateMeasurement(row({ date: "2026-02-30" }), ["M"]),
    ).toThrow();
    expect(() => validateMeasurement(row({ reference: "" }), ["M"])).toThrow();
  });
});
describe("Corrosion persistence, exploratory only", () => {
  const readings = () =>
    Array.from({ length: 6 }, (_, j) => j + 1).flatMap((c) => [
      row({
        mixId: "C",
        sampleId: "C",
        age: c * 7,
        cycle: c,
        value: -100,
        exposure: "control",
      }),
      row({ age: c * 7, cycle: c, value: c < 2 ? -120 : -220 }),
    ]);
  it("threshold 100 over 3 cycles: start=2, complete=4", () => {
    const s = corrosionRuns(readings(), "C", "combined", "control", 100, 3)[0];
    expect(s.first?.cycle).toBe(2);
    expect(s.confirmed?.cycle).toBe(4);
  });
  it("missing control at 3 breaks run; next valid run 4,5,6", () => {
    const data = readings().filter((r) => !(r.mixId === "C" && r.cycle === 3));
    const s = corrosionRuns(data, "C", "combined", "control", 100, 3)[0];
    expect(s.first?.cycle).toBe(4);
    expect(s.confirmed?.cycle).toBe(6);
  });
  it("unmatched electrode produces no flags", () => {
    const data = readings().map((r) =>
      r.mixId === "C" ? { ...r, reference: "other" } : r,
    );
    expect(
      corrosionRuns(data, "C", "combined", "control", 100, 3)[0].confirmed,
    ).toBeNull();
  });
});
describe("Example and backups", () => {
  it("example is fully synthetic and validates through schema", () => {
    const p = exampleProject();
    expect(p.measurements.every((m) => m.origin === "sample")).toBe(true);
    expect(
      validateWorkspace({ version: 1, projects: [p], activeId: p.id }).projects,
    ).toHaveLength(1);
  });
  it("rejects corrupted workspace without modifying input", () => {
    const p = exampleProject();
    p.mixes[0].materials[0].percent = 80;
    expect(() =>
      validateWorkspace({ version: 1, projects: [p], activeId: p.id }),
    ).toThrow();
  });
});
