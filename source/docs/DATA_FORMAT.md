# Import and export format

Use CSV with a header or an Excel `.xlsx` worksheet with headers in row 1. Choose one worksheet to import. The app previews validated rows; nothing is saved until **Import validated rows** is clicked. Existing observations are never silently replaced. File limit: 10 MB. Row limit: 10,000 per import. `.xls` must be converted to `.xlsx`. Formula cells in Excel require a cached numerical result; there is no formula recalculation engine.

## Measurement columns

| Column | Meaning |
| --- | --- |
| sampleId | Required unique specimen/replicate identifier; reused across distinct monitoring cycles if appropriate |
| mixId | Required exact ID of an already saved mix recipe |
| test | strength, mass, length, absorption, resistivity, chloride, potential, current or custom |
| value | Finite numerical result, without unit text in the cell |
| unit | Canonical unit below; arbitrary explicit unit for custom measurements |
| age | Nonnegative elapsed age/test time in days; keep the meaning consistent within a project |
| date | Actual test date, YYYY-MM-DD |
| exposure | Required condition label; exact text is used for grouping |
| phase | Optional label, e.g. wet or dry; exact text is used for grouping |
| cycle | Optional nonnegative integer; required to use persistence screening |
| method | Required protocol/instrument configuration label; separate different measurement configurations |
| reference | Required reference electrode label for potential; otherwise blank |
| origin | sample or experimental; omission defaults to experimental, so label sample data explicitly |
| kind | measured or calculated; omission defaults to measured |
| notes | Optional record notes |
| rawInputs | Optional JSON object of numerical raw inputs, e.g. {"load":100,"area":2500} |

Canonical units: strength MPa; mass/length/absorption %; resistivity kΩ·cm; chloride depth mm; potential mV; current µA/cm². Convert other units yourself before importing. The parser rejects incompatible standard indicator units rather than silently converting them.

IDs, phases, exposure labels, methods and electrodes are case sensitive. Duplicate observation identities within the file or against the register are rejected. Use distinct sample/replicate IDs for different specimens or independent repeats.

## Exports

- Raw measurement CSV preserves provenance, method, cycle, reference, raw input JSON and record ID.
- Summary CSV includes conditions, n, mean, sample SD, range and matched control comparisons.
- SVG exports include the full main graph and a legend, not just a screenshot or legend icon. A title preserves the selected conditions.
- The Excel workbook contains Project, Measurements, Summary, Mixes, Specimen schedule and Calculations sheets. Densities and ratios are retained; these are results/input snapshots, not embedded spreadsheet formulas.
- PDF reports contain a defined data-appendix scope. Their plot is separately labelled with the chosen condition. Unicode unit glyphs are transliterated in the PDF where appropriate.
- JSON workspace backups are schema-validated and retain all projects, input snapshots, plans and observations. Restore adds new project copies; it is not a merge-by-observation synchronisation engine.

CSV exports escape spreadsheet formula-like strings. Files are generated locally; no server receives measurement uploads from this application.
