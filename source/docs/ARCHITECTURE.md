# Architecture and future database support

## Layers

- domain/types.ts: typed project entities and canonical indicator labels.
- domain/calculations.ts: pure unit-aware arithmetic, validation, group statistics and exploratory persistence screening. No DOM/storage access.
- domain/defaults.ts: deterministic synthetic project and editable input defaults.
- services/repository.ts: versioned Zod schema, semantic validation and WorkspaceRepository abstraction. LocalRepository is the initial implementation.
- services/files.ts: CSV/XLSX parsing and data exports. ExcelJS loads only when needed.
- services/chart.ts: full graph SVG capture plus provenance title/legend.
- services/report.ts: on-demand jsPDF import, embedded licensed fonts, paginated report and graph rasterisation for the PDF.
- components/: shared labelled controls and graph rendering.
- modules/: each end-user workflow, sharing the active project through typed update callbacks.
- App.tsx: project management, navigation, persistence feedback, backups and recovery.

Calculations remain the same when persistence changes. Snapshot calculations keep a full copy of their inputs rather than looking up mutable recipes at report time. Batch plans intentionally use the current saved recipe, so update a recipe with care if existing plans depend on it. Record separate recipe IDs for protocol revisions.

## Adding a database safely

Implement a server-backed repository with authenticated users and project membership, then introduce asynchronous load/save and conflict handling. Do not store database credentials in the Vite bundle. Use a backend/API with:

1. User identity and per-project read/write authorisation.
2. Server-side schema and numerical validation, independent of browser checks.
3. Versioned observations/recipes and an append-only audit history.
4. Concurrency/version checks rather than last-writer-wins workspace replacement.
5. Encrypted transport, access logging, retention policy and institutional backup.
6. Size/decompression limits and file validation for any server-side imports.
7. Explicit sharing controls and export permissions for research data.
8. Migration and recovery tests for schema versions.

The existing single JSON object is suitable for an initial local browser workspace, not a concurrent lab database. Splitting projects, materials, recipes, batches, observations, datasets and snapshots into independently versioned records is recommended for multi-user operation.

## Current limits

No live instrument acquisition, remote sync, role-based access, online result portal, advanced inference, automatic unit conversion, standard classification, chemical activator optimisation or peer-reviewed scientific validation is claimed. The external dataset link is a library resource, not a hidden automated download.
