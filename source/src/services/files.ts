import Papa from "papaparse";
import type { Measurement, Project, Workspace } from "../domain/types";
import { uid, now, TESTS } from "../domain/types";
import {
  validateMeasurement,
  groupStats,
  batchVolume,
  mixQuantities,
} from "../domain/calculations";
export const download = (name: string, data: BlobPart, type = "text/plain") => {
  const u = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 2000);
};
export function csvExport(name: string, rows: object[]) {
  download(
    name,
    Papa.unparse(rows, { escapeFormulae: true }),
    "text/csv;charset=utf-8",
  );
}
export const measureColumns = [
  "sampleId",
  "mixId",
  "test",
  "value",
  "unit",
  "age",
  "date",
  "exposure",
  "phase",
  "cycle",
  "method",
  "reference",
  "origin",
  "kind",
  "notes",
];
export function exportMeasurements(rows: Measurement[]) {
  return rows.map(({ id, raw, datasetId, ...m }) => ({
    ...m,
    rawInputs: JSON.stringify(raw),
    recordId: id,
    datasetId,
  }));
}
export async function readFile(
  file: File,
): Promise<{ sheets: { name: string; rows: Record<string, unknown>[] }[] }> {
  if (file.size > 10 * 1024 * 1024)
    throw Error("Import a file smaller than 10 MB.");
  if (file.name.toLowerCase().endsWith(".csv")) {
    const content = await file.text();
    const first = Papa.parse<string[]>(content, { preview: 1 });
    const head =
      first.data[0]?.map((h) => h.trim().replace(/^\uFEFF/, "")) || [];
    if (new Set(head).size !== head.length)
      throw Error("Duplicate CSV headers.");
    const parsed = Papa.parse<Record<string, unknown>>(content, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim().replace(/^\uFEFF/, ""),
    });
    if (parsed.errors.length) throw Error("CSV: " + parsed.errors[0].message);
    if (
      parsed.meta.fields &&
      new Set(parsed.meta.fields).size !== parsed.meta.fields.length
    )
      throw Error("Duplicate CSV headers.");
    return { sheets: [{ name: "CSV", rows: parsed.data }] };
  }
  if (!file.name.toLowerCase().endsWith(".xlsx"))
    throw Error("Use CSV or .xlsx. Convert older .xls files to .xlsx first.");
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  return {
    sheets: workbook.worksheets.map((sheet) => {
      const headers: string[] = [];
      sheet
        .getRow(1)
        .eachCell((cell, i) => (headers[i - 1] = cell.text.trim()));
      if (new Set(headers).size !== headers.length)
        throw Error(`Duplicate headers in ${sheet.name}.`);
      const rows: Record<string, unknown>[] = [];
      sheet.eachRow((row, i) => {
        if (i === 1) return;
        const obj: Record<string, unknown> = {};
        headers.forEach((h, j) => {
          const cell = row.getCell(j + 1);
          const value = cell.value;
          obj[h] =
            value instanceof Date
              ? value.toISOString().slice(0, 10)
              : typeof value === "object" && value !== null && "result" in value
                ? value.result
                : cell.text;
        });
        if (Object.values(obj).some((v) => String(v).trim())) rows.push(obj);
      });
      return { name: sheet.name, rows };
    }),
  };
}
export function importRows(
  rows: Record<string, unknown>[],
  mixIds: string[],
  datasetId: string,
): Measurement[] {
  if (!rows.length || rows.length > 10000)
    throw Error("Import between 1 and 10,000 rows.");
  return rows.map((r, i) => {
    try {
      const text = (k: string) => String(r[k] ?? "").trim();
      const number = (k: string) => {
        if (!text(k)) throw Error(`${k} is blank.`);
        const v = Number(r[k]);
        if (!Number.isFinite(v)) throw Error(`${k} must be numeric.`);
        return v;
      };
      const test = text("test") as Measurement["test"];
      if (!(test in TESTS))
        throw Error("Unknown test code. Use " + Object.keys(TESTS).join(", "));
      const origin = text("origin") || "experimental";
      const kind = text("kind") || "measured";
      if (
        !["sample", "experimental"].includes(origin) ||
        !["measured", "calculated"].includes(kind)
      )
        throw Error("Invalid origin or kind.");
      let raw: Record<string, number> = {};
      if (text("rawInputs")) {
        const parsed = JSON.parse(text("rawInputs"));
        if (
          typeof parsed !== "object" ||
          parsed === null ||
          Array.isArray(parsed) ||
          Object.values(parsed).some(
            (v) => typeof v !== "number" || !Number.isFinite(v),
          )
        )
          throw Error(
            "rawInputs must be a JSON object containing finite numbers.",
          );
        raw = parsed;
      }
      return validateMeasurement(
        {
          id: uid(),
          sampleId: text("sampleId"),
          mixId: text("mixId"),
          test,
          value: number("value"),
          unit: text("unit"),
          age: number("age"),
          date: text("date"),
          exposure: text("exposure"),
          phase: text("phase"),
          cycle: text("cycle") ? number("cycle") : null,
          method: text("method"),
          reference: text("reference"),
          origin: origin as Measurement["origin"],
          kind: kind as Measurement["kind"],
          raw,
          notes: text("notes"),
          datasetId,
        },
        mixIds,
      );
    } catch (e) {
      throw Error(`Row ${i + 2}: ${(e as Error).message}`);
    }
  });
}
export async function workbookExport(project: Project) {
  const { default: ExcelJS } = await import("exceljs");
  const w = new ExcelJS.Workbook();
  w.creator = "FIFLAB";
  w.created = new Date();
  const add = (name: string, rows: object[]) => {
    const s = w.addWorksheet(name);
    if (!rows.length) {
      s.addRow(["No records"]);
      return;
    }
    const keys = Object.keys(rows[0]);
    s.addRow(keys);
    for (const obj of rows)
      s.addRow(keys.map((k) => (obj as Record<string, unknown>)[k] ?? ""));
    s.getRow(1).font = { bold: true };
    s.columns.forEach((c) => (c.width = 23));
    s.views = [{ state: "frozen", ySplit: 1 }];
  };
  add("Project", [
    {
      name: project.name,
      researcher: project.researcher,
      description: project.description,
      exported: now(),
      software: "FIFLAB 1.0.0",
    },
  ]);
  add("Measurements", exportMeasurements(project.measurements));
  add(
    "Summary",
    groupStats(project.measurements).map(
      ({
        mixId,
        test,
        age,
        cycle,
        unit,
        exposure,
        phase,
        method,
        reference,
        origin,
        n,
        mean,
        sd,
      }) => ({
        mixId,
        test,
        age,
        cycle,
        unit,
        exposure,
        phase,
        method,
        reference,
        origin,
        n,
        mean,
        sd: sd ?? "",
      }),
    ),
  );
  add(
    "Mixes",
    project.mixes.flatMap((m) =>
      m.materials.map((a) => ({
        mixId: m.id,
        name: m.name,
        material: a.name,
        percent: a.percent,
        density_kg_m3: a.density,
        kind: a.kind,
        water_binder: m.wb,
        sand_binder: m.sandRatio,
        coarse_binder: m.coarseRatio,
        additional_liquid_binder: m.liquidRatio,
        additional_liquid_density: m.liquidDensity,
        sand_density: m.sandDensity,
        coarse_density: m.coarseDensity,
        air_percent: m.air,
        waste_percent: m.waste,
        notes: m.notes,
      })),
    ),
  );
  add(
    "Specimen schedule",
    project.batches.map((b) => ({
      ...b.geometry,
      group: b.group,
      mixId: b.mixId,
      purpose: b.purpose,
      ages: b.ages.join(";"),
      destructive: b.destructive,
      totalVolumeL: batchVolume(b).totalL,
      specimens: batchVolume(b).count,
    })),
  );
  add(
    "Calculations",
    project.calculations.flatMap((c) =>
      mixQuantities(c.mix, c.mode, c.target).items.map((i) => ({
        calculation: c.name,
        mixId: c.mix.id,
        mode: c.mode,
        target: c.target,
        material: i.material,
        baseKg: i.baseKg,
        withWasteKg: i.withWasteKg,
        created: c.created,
      })),
    ),
  );
  const buffer = await w.xlsx.writeBuffer();
  download(
    "cementlab-project.xlsx",
    buffer as unknown as BlobPart,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
}
export const backup = (w: Workspace) =>
  download(
    "cementlab-workspace.json",
    JSON.stringify(w, null, 2),
    "application/json",
  );
