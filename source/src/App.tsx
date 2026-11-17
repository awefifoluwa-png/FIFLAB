import { useState, useEffect, useRef, Component, type ReactNode } from "react";
import { LocalRepository, validateWorkspace } from "./services/repository";
import { exampleProject, newProject } from "./domain/defaults";
import { uid, type Workspace, type Project } from "./domain/types";
import { batchVolume } from "./domain/calculations";
import {
  Panel,
  Stat,
  Table,
  Badge,
  Note,
  ErrorBox,
  Empty,
  fmt,
  describeError,
  type ModuleProps,
} from "./components/UI";
import MixDesign from "./modules/MixDesign";
import BatchPlanner, { SpecimenCalculator } from "./modules/Specimens";
import LabManager from "./modules/LabManager";
import DataAnalysis from "./modules/Analysis";
import DataImport from "./modules/DataImport";
import ResearchLibrary from "./modules/ResearchLibrary";
import Reports from "./modules/Reports";
import { backup, download } from "./services/files";
const repository = new LocalRepository();
let initialError = "";
function initial(): Workspace {
  try {
    const saved = repository.load();
    if (saved) return saved;
  } catch {
    initialError =
      "Saved browser data could not be validated. It has not been overwritten. Download a recovery copy or restore a valid workspace backup.";
  }
  const p = exampleProject();
  return { version: 1, projects: [p], activeId: p.id };
}
const sections = [
  ["Dashboard", "01"],
  ["Mix calculator", "02"],
  ["Batch planner", "03"],
  ["Specimen calculator", "04"],
  ["Laboratory tests", "05"],
  ["Durability analysis", "06"],
  ["Data analysis", "07"],
  ["Data import", "08"],
  ["Research library", "09"],
  ["Reports", "10"],
];
const descriptions: Record<string, string> = {
  Dashboard:
    "Your projects, calculations and experimental records in one workspace.",
  "Mix calculator":
    "Design and inspect material quantities with transparent mass and volume calculations.",
  "Batch planner":
    "Plan specimens and material quantities across experimental groups and ages.",
  "Specimen calculator":
    "Calculate specimen volumes and geometric material estimates.",
  "Laboratory tests":
    "Enter measured observations and retain raw inputs for calculated results.",
  "Durability analysis":
    "Compare indicators and exposure responses without conflating durability measures.",
  "Data analysis":
    "Filter observations, inspect replicates and export reproducible summaries.",
  "Data import":
    "Bring tidy laboratory data into the project from CSV or Excel.",
  "Research library":
    "Research guidance, verified reference editions and reusable templates.",
  Reports:
    "Prepare a research record with calculations, data, graphs and assumptions.",
};
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: string }
> {
  state = { error: "" };
  static getDerivedStateFromError(e: Error) {
    return { error: e.message };
  }
  render() {
    return this.state.error ? (
      <main className="p-8">
        <h1>Workspace display error</h1>
        <p>{this.state.error}</p>
        <p>
          Browser data is retained. Download a recovery copy before refreshing.
        </p>
        <button
          onClick={() =>
            download(
              "cementlab-recovery.json",
              localStorage.getItem(repository.key) || "{}",
              "application/json",
            )
          }
        >
          Download browser recovery copy
        </button>
        <button onClick={() => location.reload()}>Reload application</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  const [workspace, setWorkspace] = useState<Workspace>(initial);
  const [tab, setTab] = useState("Dashboard");
  const [message, setMessage] = useState("");
  const [storageError, setStorageError] = useState(initialError);
  const [recover, setRecover] = useState(!!initialError);
  const [menu, setMenu] = useState(false);
  const [edit, setEdit] = useState<"new" | "edit" | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const project = workspace.projects.find((p) => p.id === workspace.activeId)!;
  const notify = (s: string) => setMessage(s);
  const go = (t: string) => {
    setTab(t);
    setMenu(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  useEffect(() => {
    if (recover) return;
    try {
      repository.save(workspace);
      setStorageError("");
    } catch {
      setStorageError(
        "Browser storage could not be saved (quota or access restriction). Changes are in memory only. Download a backup before leaving.",
      );
    }
  }, [workspace, recover]);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 7000);
    return () => clearTimeout(timer);
  }, [message]);
  const update = (fn: (p: Project) => Project) =>
    setWorkspace((w) => ({
      ...w,
      projects: w.projects.map((p) => (p.id === w.activeId ? fn(p) : p)),
    }));
  const props: ModuleProps = { project, update, notify, go };
  const loadExample = () => {
    const p = exampleProject();
    setWorkspace((w) => ({
      ...w,
      projects: [...w.projects, p],
      activeId: p.id,
    }));
    go("Dashboard");
    notify("A separate synthetic example project was added.");
  };
  const restore = async (file: File) => {
    try {
      if (file.size > 20 * 1024 * 1024)
        throw Error("Workspace backups must be under 20 MB.");
      const loaded = validateWorkspace(JSON.parse(await file.text()));
      const added = loaded.projects.map((p) => ({
        ...p,
        id: uid(),
        name: p.name + " (restored)",
      }));
      setWorkspace((w) => ({
        ...w,
        projects: [...w.projects, ...added],
        activeId: added[0].id,
      }));
      setRecover(false);
      notify(
        `Restored ${added.length} projects as new copies; existing projects were kept.`,
      );
    } catch (e) {
      notify("Restore failed: " + describeError(e));
    }
  };
  return (
    <div className="app">
      <a href="#main" className="skip-link">
        Skip to workspace
      </a>
      <aside className={"sidebar " + (menu ? "open" : "")}>
        <a
          href="#"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            go("Dashboard");
          }}
        >
          <span className="brand-mark">C</span>
          <span>
            FIFLAB<small>RESEARCH STUDIO</small>
          </span>
        </a>
        <p className="nav-label">RESEARCH WORKSPACE</p>
        <nav aria-label="Research modules">
          {sections.map(([name, n]) => (
            <button
              key={name}
              className={tab === name ? "active" : ""}
              aria-current={tab === name ? "page" : undefined}
              onClick={() => go(name)}
            >
              <span>{n}</span>
              {name}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="online-dot" />
          Browser workspace<small>Version 1.0.0 · No server sync</small>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <button
            className="mobile-toggle"
            aria-label="Toggle navigation"
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            ☰
          </button>
          <div>
            <span className="small muted">Active project</span>
            <select
              aria-label="Active project"
              value={project.id}
              onChange={(e) => {
                setWorkspace({ ...workspace, activeId: e.target.value });
                go("Dashboard");
              }}
            >
              {workspace.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="top-actions">
            <button onClick={() => setEdit("edit")}>Project details</button>
            <button className="primary" onClick={() => setEdit("new")}>
              New project
            </button>
          </div>
        </header>
        <main id="main" className="workspace">
          <div className="page-title">
            <div>
              <p className="eyebrow">
                CEMENTITIOUS MATERIALS /{" "}
                {tab === "Dashboard" ? "OVERVIEW" : "RESEARCH TOOLS"}
              </p>
              <h1>{tab}</h1>
              <p>{descriptions[tab]}</p>
            </div>
            <span className="version-label">LOCAL WORKSPACE</span>
          </div>
          {project.measurements.some((m) => m.origin === "sample") && (
            <div className="sample-banner">
              <strong>Synthetic example data present.</strong>{" "}
              {project.measurements.filter((m) => m.origin === "sample").length}{" "}
              illustrative observations are labelled “sample”. They are not
              experimental findings.
            </div>
          )}
          {storageError && (
            <div className="error-box">
              <p>{storageError}</p>
              <button
                onClick={() =>
                  download(
                    "cementlab-recovery.json",
                    localStorage.getItem(repository.key) || "{}",
                    "application/json",
                  )
                }
              >
                Download stored recovery copy
              </button>
            </div>
          )}
          {message && (
            <div className="toast" role="status">
              {message}
              <button
                aria-label="Dismiss message"
                onClick={() => setMessage("")}
              >
                ×
              </button>
            </div>
          )}
          <div key={project.id + "-" + tab}>
            {tab === "Dashboard" ? (
              <Dashboard {...props} projects={workspace.projects.length} />
            ) : tab === "Mix calculator" ? (
              <MixDesign {...props} />
            ) : tab === "Batch planner" ? (
              <BatchPlanner {...props} />
            ) : tab === "Specimen calculator" ? (
              <SpecimenCalculator {...props} />
            ) : tab === "Laboratory tests" ? (
              <LabManager {...props} />
            ) : tab === "Durability analysis" ? (
              <DataAnalysis {...props} durability />
            ) : tab === "Data analysis" ? (
              <DataAnalysis {...props} />
            ) : tab === "Data import" ? (
              <DataImport {...props} />
            ) : tab === "Research library" ? (
              <ResearchLibrary {...props} />
            ) : (
              <Reports {...props} />
            )}
          </div>
          <footer className="workspace-footer">
            <span>
              FIFLAB · Research calculations, clearly
              documented.
            </span>
            <div>
              <button
                disabled={exportBusy}
                onClick={() => {
                  setExportBusy(true);
                  try {
                    backup(workspace);
                    notify("Workspace backup downloaded.");
                  } finally {
                    setExportBusy(false);
                  }
                }}
              >
                Download backup
              </button>
              <label className="file-link">
                Restore backup
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void restore(f);
                    e.target.value = "";
                  }}
                />
              </label>
              <button onClick={loadExample}>Add example project</button>
            </div>
            <p>
              Data belongs to this browser and device. Clearing site data
              removes it; downloads are your durable copies. No accounts, online
              sharing or automatic backup.
            </p>
          </footer>
        </main>
      </div>
      {edit && (
        <ProjectDialog
          mode={edit}
          project={project}
          onClose={() => setEdit(null)}
          save={(name, researcher, description) => {
            if (edit === "new") {
              const p = { ...newProject(name), researcher, description };
              setWorkspace((w) => ({
                ...w,
                projects: [...w.projects, p],
                activeId: p.id,
              }));
              go("Dashboard");
            } else update((p) => ({ ...p, name, researcher, description }));
            notify(
              edit === "new"
                ? "Research project created."
                : "Project information saved.",
            );
            setEdit(null);
          }}
        />
      )}
    </div>
  );
}
function ProjectDialog({
  mode,
  project,
  onClose,
  save,
}: {
  mode: "new" | "edit";
  project: Project;
  onClose: () => void;
  save: (name: string, researcher: string, description: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(mode === "new" ? "" : project.name),
    [researcher, setResearcher] = useState(
      mode === "new" ? "" : project.researcher,
    ),
    [description, setDescription] = useState(
      mode === "new" ? "" : project.description,
    );
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} onCancel={onClose} aria-labelledby="project-dialog-title">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) save(name.trim(), researcher, description);
        }}
      >
        <h2 id="project-dialog-title">
          {mode === "new" ? "Create research project" : "Project information"}
        </h2>
        <label className="field">
          <span>Project name</span>
          <input
            autoFocus
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Researcher / team</span>
          <input
            value={researcher}
            onChange={(e) => setResearcher(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Research scope and notes</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <div className="actions">
          <button className="primary" type="submit">
            Save project
          </button>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </dialog>
  );
}
function Dashboard({
  project,
  go,
  projects,
}: ModuleProps & { projects: number }) {
  const count = project.batches.reduce((s, b) => s + batchVolume(b).count, 0);
  return (
    <>
      <div className="stats-grid">
        <Stat
          label="Research projects"
          value={projects}
          detail="Stored in this browser"
        />
        <Stat
          label="Saved mix recipes"
          value={project.mixes.length}
          detail="Current project"
        />
        <Stat
          label="Planned specimens"
          value={count}
          detail={`${project.batches.length} experimental groups`}
        />
        <Stat
          label="Recorded observations"
          value={project.measurements.length}
          detail={`${project.datasets.length} dataset records`}
        />
      </div>
      <div className="dashboard-grid">
        <Panel
          title="Research project"
          description={project.researcher || "Researcher not specified"}
          action={
            <Badge tone={project.sample ? "amber" : "teal"}>
              {project.sample ? "Example project" : "Research project"}
            </Badge>
          }
        >
          <h3 className="project-name">{project.name}</h3>
          <p>
            {project.description ||
              "Add a research question and project information to describe your work."}
          </p>
          <div className="workflow">
            <button onClick={() => go("Mix calculator")}>
              <b>01</b>
              <span>
                Define a mix<small>Proportions and quantities</small>
              </span>
            </button>
            <button onClick={() => go("Batch planner")}>
              <b>02</b>
              <span>
                Plan specimens<small>Groups, ages and volumes</small>
              </span>
            </button>
            <button onClick={() => go("Laboratory tests")}>
              <b>03</b>
              <span>
                Record measurements<small>Raw and calculated values</small>
              </span>
            </button>
            <button onClick={() => go("Data analysis")}>
              <b>04</b>
              <span>
                Analyse & export<small>Summaries, plots and reports</small>
              </span>
            </button>
          </div>
        </Panel>
        <Panel title="Recent activity">
          <h3 className="subheading">Calculation snapshots</h3>
          {project.calculations.length ? (
            project.calculations.slice(0, 4).map((c) => (
              <div className="activity" key={c.id}>
                <span className="activity-dot" />
                <div>
                  <strong>{c.name}</strong>
                  <small>{c.created.slice(0, 10)} · inputs retained</small>
                </div>
              </div>
            ))
          ) : (
            <p className="small muted">
              No calculation snapshots yet. Save one from the mix calculator.
            </p>
          )}
          <h3 className="subheading">Recent datasets</h3>
          {project.datasets.length ? (
            project.datasets.slice(0, 4).map((d) => (
              <div className="activity" key={d.id}>
                <span className="activity-dot teal" />
                <div>
                  <strong>{d.name}</strong>
                  <small>
                    {d.rows} original rows · {d.created.slice(0, 10)}
                  </small>
                </div>
              </div>
            ))
          ) : (
            <p className="small muted">
              Import a CSV or Excel file to start a dataset.
            </p>
          )}
          <button onClick={() => go("Data import")}>Import a dataset</button>
        </Panel>
      </div>
      <Panel
        title="Saved experimental groups"
        action={
          <button onClick={() => go("Batch planner")}>Open planner</button>
        }
      >
        {project.batches.length ? (
          <Table
            headers={[
              "Group",
              "Mix",
              "Purpose",
              "Ages (days)",
              "Specimens",
              "Net volume",
            ]}
          >
            {project.batches.slice(0, 8).map((b) => (
              <tr key={b.id}>
                <td>{b.group}</td>
                <td>{b.mixId}</td>
                <td>{b.purpose}</td>
                <td>{b.ages.join(", ")}</td>
                <td>{batchVolume(b).count}</td>
                <td>{fmt(batchVolume(b).totalL)} L</td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty>
            No experimental groups yet. Create a recipe, then plan a group.
          </Empty>
        )}
      </Panel>
      <Note>
        Calculations are transparent planning tools. Validate assumptions and
        laboratory methods before relying on a result. A geometric estimate or a
        single durability indicator does not establish compliance or material
        performance.
      </Note>
    </>
  );
}
