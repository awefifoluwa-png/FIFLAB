import { useState } from "react";
import {
  Panel,
  Note,
  Badge,
  type ModuleProps,
  Table,
  Empty,
} from "../components/UI";
import { references, datasetReference } from "../domain/references";
import { csvExport, exportMeasurements } from "../services/files";
import { groupStats } from "../domain/calculations";
export default function ResearchLibrary({ project, go }: ModuleProps) {
  const [tab, setTab] = useState("Procedures");
  return (
    <>
      <div className="tool-tabs">
        {[
          "Procedures",
          "Standards",
          "Datasets & templates",
          "Project findings",
        ].map((t) => (
          <button
            key={t}
            className={tab === t ? "selected" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Procedures" && (
        <>
          <Panel title="A reproducible laboratory record">
            <ol className="procedure">
              <li>
                <h3>Define the comparison before testing</h3>
                <p>
                  Record the research question, binder recipes, control groups,
                  replicate plan, exposure conditions, primary indicators and
                  decision criteria in your approved protocol.
                </p>
              </li>
              <li>
                <h3>Record material and specimen history</h3>
                <p>
                  Retain supplier certificates, densities, moisture assumptions,
                  batch masses, mixing records, specimen dimensions, preparation
                  dates and curing conditions. Assign unique specimen IDs.
                </p>
              </li>
              <li>
                <h3>Measure and retain raw inputs</h3>
                <p>
                  Record method/edition, instrument configuration, calibration
                  records, units, dates, age, exposure phase and replicate ID.
                  For corrosion potentials record the reference electrode. For
                  derived results keep the raw load, mass, length or area
                  values.
                </p>
              </li>
              <li>
                <h3>Review before interpreting</h3>
                <p>
                  Check missing values and duplicates, inspect individual
                  observations, separate incompatible methods and report sample
                  sizes. Assess whether observations are independent before
                  treating their spread as replicate variability.
                </p>
              </li>
              <li>
                <h3>Export the research record</h3>
                <p>
                  Download a project backup, raw data, calculations, statistical
                  summaries and a report. Save the approved protocol alongside
                  them in your institution's research storage.
                </p>
              </li>
            </ol>
            <Note>
              This is original record-keeping guidance, not a substitute for a
              laboratory SOP or a reproduced ASTM procedure. Obtain the full
              applicable standard and approve the protocol before testing.
            </Note>
          </Panel>
          <Panel title="Mix design examples">
            <p>
              Open the calculator to inspect control, slag, glass powder and
              combined binder recipes in the illustrative project. Ash and
              precursor components can be added with editable names, fractions
              and densities.
            </p>
            <button onClick={() => go("Mix calculator")}>
              Open mix calculator
            </button>
          </Panel>
        </>
      )}
      {tab === "Standards" && (
        <>
          <Note>
            These exact editions and scope descriptions were checked against
            ASTM publisher pages. They are reference editions, not a claim to be
            the latest version. Follow the edition required by your laboratory.
            Standard texts are not included.
          </Note>
          {references.map((r) => (
            <Panel
              key={r.id}
              title={r.id}
              action={
                <a
                  className="button-link"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={r.url}
                >
                  Publisher page
                </a>
              }
            >
              <h3>{r.title}</h3>
              <p>{r.scope}</p>
            </Panel>
          ))}
        </>
      )}
      {tab === "Datasets & templates" && (
        <>
          <Panel title="Measurement templates">
            <p>
              Templates use the tidy import format. Mix IDs must already exist
              in your project.
            </p>
            <button onClick={() => go("Data import")}>
              Open templates & import tools
            </button>
          </Panel>
          <Panel
            title="Published dataset"
            action={<Badge>External source</Badge>}
          >
            <h3>{datasetReference.title}</h3>
            <p>{datasetReference.description}</p>
            <p className="small">DOI: {datasetReference.doi}</p>
            <a
              target="_blank"
              rel="noopener noreferrer"
              href={datasetReference.url}
            >
              View dataset and download files at UCI
            </a>
            <p className="small">
              Its original columns differ from this app's measurement format.
              Reshape the relevant observations before importing; no automatic
              interpretation is applied.
            </p>
          </Panel>
          <Panel title="Illustrative project dataset">
            <p>
              Built-in synthetic measurements are for trying the workflow. They
              are not published research findings.
            </p>
            <button
              disabled={
                !project.measurements.some((m) => m.origin === "sample")
              }
              onClick={() =>
                csvExport(
                  "synthetic-example-measurements.csv",
                  exportMeasurements(
                    project.measurements.filter((m) => m.origin === "sample"),
                  ),
                )
              }
            >
              Download current sample records
            </button>
          </Panel>
        </>
      )}
      {tab === "Project findings" && (
        <Panel
          title="Your research records"
          description="Only actual experimental entries in the selected project are counted here. The software does not author scientific conclusions."
        >
          {project.measurements.some((m) => m.origin === "experimental") ? (
            <>
              <p>
                {
                  project.measurements.filter(
                    (m) => m.origin === "experimental",
                  ).length
                }{" "}
                experimental observations;{" "}
                {
                  groupStats(
                    project.measurements.filter(
                      (m) => m.origin === "experimental",
                    ),
                  ).length
                }{" "}
                distinct statistical groups.
              </p>
              <div className="actions">
                <button onClick={() => go("Data analysis")}>
                  Inspect experimental results
                </button>
                <button onClick={() => go("Reports")}>Prepare a report</button>
              </div>
              <Table headers={["Dataset", "Original rows", "Imported"]}>
                {project.datasets.map((d) => (
                  <tr key={d.id}>
                    <td>{d.name}</td>
                    <td>{d.rows}</td>
                    <td>{d.created.slice(0, 10)}</td>
                  </tr>
                ))}
              </Table>
            </>
          ) : (
            <Empty>
              No actual experimental findings have been entered. Record your
              measurements in Laboratory tests or import your data.
            </Empty>
          )}
        </Panel>
      )}
    </>
  );
}
