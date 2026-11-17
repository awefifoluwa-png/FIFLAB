import { it, expect } from "vitest";
import ExcelJS from "exceljs";
import { importRows, readFile } from "../src/services/files";
const record = {
  sampleId: "S1",
  mixId: "M",
  test: "strength",
  value: "40",
  unit: "MPa",
  age: "28",
  date: "2026-01-01",
  exposure: "Reference",
  method: "Load/area",
  origin: "experimental",
};
it("import uses numeric values and retains declared origin", () => {
  const r = importRows([record], ["M"], "D")[0];
  expect(r.value).toBe(40);
  expect(r.kind).toBe("measured");
  expect(r.origin).toBe("experimental");
});
it("blank and unknown units do not silently become zero or convert", () => {
  expect(() => importRows([{ ...record, value: "" }], ["M"], "D")).toThrow(
    /Row 2/,
  );
  expect(() => importRows([{ ...record, unit: "psi" }], ["M"], "D")).toThrow(
    /MPa/,
  );
  expect(() => importRows([record], ["OTHER"], "D")).toThrow(/mix ID/);
});
it("raw numeric inputs and sample labels survive reimport", () => {
  const r = importRows(
    [
      {
        ...record,
        kind: "calculated",
        origin: "sample",
        rawInputs: '{"load":100,"area":2500}',
      },
    ],
    ["M"],
    "D",
  )[0];
  expect(r.raw.load).toBe(100);
  expect(r.origin).toBe("sample");
});
it("CSV quoting and worksheet extraction use actual libraries", async () => {
  const text =
    'sampleId,mixId,test,value,unit,age,date,exposure,method\nS1,M,strength,40,MPa,28,2026-01-01,"Reference, lab",Load/area';
  const r = await readFile(new File([text], "test.csv"));
  expect(r.sheets[0].rows[0].exposure).toBe("Reference, lab");
  const w = new ExcelJS.Workbook();
  const s = w.addWorksheet("Results");
  s.addRow(Object.keys(record));
  s.addRow(Object.values(record));
  const b = await w.xlsx.writeBuffer();
  const x = await readFile(new File([b as BlobPart], "test.xlsx"));
  expect(x.sheets[0].name).toBe("Results");
  expect(importRows(x.sheets[0].rows, ["M"], "X")[0].value).toBe(40);
});
