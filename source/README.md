# FIFLAB

A functional browser-based research workspace for cementitious materials: mix quantities, specimen planning, laboratory measurements, durability comparisons, statistical analysis and reproducible exports.

**Version:** 1.0.0. **Stack:** React, TypeScript, Vite, Tailwind CSS, Recharts, ExcelJS, Papa Parse, jsPDF and Zod. The application has no paid APIs, backend credentials or required account.

## Start without programming

The delivery includes a prebuilt **netlify-ready** folder. Upload that folder to Netlify Drop. See `docs/DEPLOYMENT.md`. Once deployed, use a recent desktop or mobile browser. The development source does not need to be uploaded for a manual deployment.

The app initially opens a synthetic example. Its measurements are explicitly marked `sample`; they are not Fifoluwa Awe's experimental findings. Create a **New project** for your own work, or keep sample and experimental records separate using the origin selector. Analysis never pools these origins.

## Install the source

Use Node.js 22.12+ (Node 24 is also supported) and npm:

```sh
npm ci
npm run dev
```

Open the Vite address printed in the terminal. To produce a static deployment:

```sh
npm test
npm run build
npm run preview
```

`dist/` contains the complete production website. Serve it over HTTP(S); do not double-click `dist/index.html`, because modern module loading needs a web server. A development environment was not needed to use the prebuilt package.

## Workspace workflow

1. Create a project and enter the researcher/team and scope.
2. Create or load a mix in **Mix calculator**. Specify fractions, densities, ratios, air and waste. Save the recipe; save a calculation snapshot when a particular batch calculation should be retained.
3. Use **Specimen calculator** to check geometry, then save experimental groups in **Batch planner**. Choose whether new specimens are consumed at each age or the same specimens are monitored repeatedly.
4. Record results in **Laboratory tests**, or import a tidy CSV/XLSX dataset through **Data import**. Imports are previewed and validated before committing any observations.
5. Filter by indicator, data origin, exposure, method, phase, units and electrode in **Data analysis**. Inspect sample counts and SD, not only the plot.
6. Use **Durability analysis** for exposure-specific comparisons and exploratory corrosion screening. No single indicator is converted into an overall durability score.
7. Export your report, spreadsheet, plots and data. Download a JSON workspace backup regularly.

## Functional modules

| Module | Implemented behaviour |
| --- | --- |
| Dashboard | Project switcher, project creation/editing, counts, recent calculation snapshots, datasets, experimental groups and tool shortcuts |
| Mix design | Arbitrary named binder components; cement/SCM/precursor roles; added water, sand, coarse aggregate, additional liquid, air and waste; binder-mass or absolute-volume basis; live quantities; saved recipes and input snapshots; CSV |
| Batch planner | Editable experimental groups, recipe IDs, test purposes, ages, specimen geometry and count; destructive/repeated schedules; per-mix material totals and CSV |
| Specimen calculator | Cubes, rectangular prisms and cylinders; optional embedded cylindrical steel; net/gross volume, quantities and fresh-density estimates |
| Laboratory tests | Strength, mass change, length change, absorption, resistivity, chloride depth, potential, current density and custom measurements; measured or calculated results with raw inputs; edit/remove/search/export |
| Durability analysis | Chloride, sulphate, combined and wet–dry tools; control comparisons; phase/electrode-specific potential screening with user-selected negative shift and persistence |
| Research data analysis | CSV and XLSX import; validated preview; filters; sample mean/SD, differences and percent change; line/bar/scatter plots and SD error bars; SVG and CSV |
| Research library | Original record-keeping guidance, downloadable templates, mix examples, externally linked verified standards and a published UCI dataset; access to your entered results |
| Report generator | Actual multi-page PDF with embedded graph and fonts; recipe assumptions, quantities, specimen schedule, calculations, measurements, grouped statistics, formulas and references; Excel workbook and CSV |

A separate Data import navigation item supports the requested analysis module.

## Scientific scope

This is a usable research planning and descriptive analysis application, **not a validated laboratory standard implementation or a certification tool**. Formulas, raw inputs and assumptions are exposed. Use the approved method and independently verify important results.

- The absolute-volume calculator assumes additive constituent volumes, user-entered densities, SSD aggregates and a user-entered air fraction. It does not perform aggregate moisture corrections or validate actual yield.
- The additional-liquid input supports mass/volume accounting for activators or admixtures. It does not design geopolymer chemistry. Added water/binder excludes solvent water already in a liquid activator unless you account for it explicitly.
- The non-cement binder fraction is reported as cement replacement only when a cement fraction is present. A cement-free precursor blend is shown as N/A.
- Specimen presets are editable examples. Geometry, rod position, cover, curing, electrical circuit and standard suitability are not certified.
- Resistivity is an entered measurement, not automatically converted across surface/bulk configurations. Chloride depth is not a diffusion or migration coefficient. Applied impressed current is not automatically corrosion current.
- Controls for ordinary group comparisons must match selected conditions, age and cycle. Corrosion screening additionally matches exact age/cycle, phase, method, reference electrode, units and origin across the selected exposed/control conditions.
- Error bars are sample SD (n−1), not confidence intervals. A single result has no estimable SD. Technical repeats and independent specimens are not automatically distinguished; design and label replicates appropriately.
- No p-values, significance claims, service-life predictions, corrosion diagnosis or overall durability ranking are produced.

See `docs/CALCULATIONS.md`, `docs/DATA_FORMAT.md` and `docs/REFERENCES.md`.

## Storage, backup and sharing

Everything is processed in your browser. `LocalRepository` in `src/services/repository.ts` persists the workspace under `cementlab.workspace.v1` in localStorage. Records are saved on changes. If storage fails, the UI reports that the changes are only in memory. Corrupt saved data is not automatically overwritten.

Browser storage is per origin, browser profile and device. It can be cleared, blocked or reach quota; it is not encrypted research storage, institutional backup, multi-user collaboration or server synchronisation. A new deployment on a different domain has separate storage. Download a backup before changing domains, clearing data or moving devices. Restore merges validated projects as new copies rather than overwriting existing projects. No private data is preloaded into the public app files. Avoid editing the same workspace in multiple tabs: this initial version does not resolve concurrent local changes.

Reports, spreadsheets, CSV, SVG and JSON are portable files you can deliberately share. The application does not publish your research results to a public server. Netlify hosts the application code, not other visitors' localStorage data. Hosting providers may still maintain their own normal request logs.

## Project structure

```text
src/
  App.tsx                  Workspace shell and project management
  main.tsx                 React entry point
  style.css                Tailwind entry and scientific app styling
  components/              Reusable controls and Recharts visualisation
  domain/                  Types, pure calculations, sample project, references
  services/                Validated storage, import/export, chart capture, PDF
  modules/                 Individual research workflows
public/                    Favicon, local report fonts, static hosting headers
 tests/                    Independently checked calculation and import tests
 docs/                     Formula, data, deployment and architecture guidance
```

## Testing and verification

Run `npm test` for the Vitest suite and `npm run build` for strict TypeScript and production compilation. Tests cover independent hand-check values, invalid input, statistical isolation, missing controls, CSV quoting, XLSX extraction and backup validation.

Browser checks performed during development included saved recipe persistence after reload, live mix quantities, derived strength entry, CSV preview/import, bar/scatter/line charts, PDF and XLSX downloads and mobile navigation. Generated PDFs were rendered for layout/graph inspection, and the XLSX workbook was reopened to verify sheet/observation counts. See `docs/VERIFICATION.md` for details. This verification is not regulatory or laboratory method validation.

## Extending to a secure database

The `WorkspaceRepository` interface separates persistence from calculations. See `docs/ARCHITECTURE.md` for a migration outline. A production team service needs authentication, authorisation, versioned records, audit trails, server validation, backup, retention and conflict handling; merely replacing localStorage is not sufficient.

## Licensing

Original application code is provided under the MIT licence in `LICENSE`. Dependencies and fonts retain their own licences; bundled notices are in `THIRD_PARTY_LICENSES.txt` and `public/fonts/LICENCE.txt`. The linked UCI dataset has its own CC BY 4.0 terms and is not redistributed here. ASTM standard texts are copyrighted and not included. Obtain lawful access to the required edition. This is licensing guidance for the delivered code, not a claim of ASTM endorsement.
