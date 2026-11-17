import { chartSVG } from "./chart";
import type { Project, Measurement } from "../domain/types";
import { TESTS } from "../domain/types";
import { groupStats, batchVolume, mixQuantities } from "../domain/calculations";
import { references, datasetReference } from "../domain/references";
const text = (s: unknown) =>
  String(s ?? "")
    .replaceAll("µ", "u")
    .replaceAll("Ω", "Ohm")
    .replaceAll("²", "^2")
    .replaceAll("³", "^3")
    .replaceAll("ρ", "rho")
    .replaceAll("Δ", "Delta")
    .replaceAll("Σ", "sum")
    .replace(/[–—−]/g, "-")
    .replaceAll("·", " ")
    .replace(/[^\x20-\x7E\n]/g, "");
async function chartPNG(id: string) {
  if (
    !document
      .getElementById(id)
      ?.querySelector(".recharts-wrapper > svg.recharts-surface")
  )
    return null;
  const { xml, width, height } = chartSVG(id, "Selected research plot");
  const blob = new Blob([xml], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(Error("Could not render report chart."));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width * 2;
    canvas.height = height * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("Canvas unavailable for report plot.");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { data: canvas.toDataURL("image/png"), ratio: height / width };
  } finally {
    URL.revokeObjectURL(url);
  }
}
export async function generateReport(
  project: Project,
  rows: Measurement[],
  chartId: string,
  scope: string,
) {
  const png = await chartPNG(chartId);
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  for (const [style, file] of [
    ["normal", "ResearchSans-Regular.ttf"],
    ["bold", "ResearchSans-Bold.ttf"],
  ]) {
    const response = await fetch(new URL("fonts/" + file, document.baseURI));
    if (!response.ok)
      throw Error(
        "Report font could not be loaded. Keep the fonts folder with the deployment.",
      );
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192)
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    pdf.addFileToVFS(file, btoa(binary));
    pdf.addFont(file, "ResearchSans", style);
  }
  let y = 24;
  const pad = 17,
    W = 176;
  function page() {
    pdf.addPage();
    y = 24;
  }
  function reserve(h: number) {
    if (y + h > 278) page();
  }
  function para(str: string, size = 10, color = "#30434c") {
    pdf.setFont("ResearchSans", "normal");
    pdf.setFontSize(size);
    pdf.setTextColor(color);
    const lines = pdf.splitTextToSize(text(str), W) as string[];
    for (const line of lines) {
      reserve(size * 0.5 + 2);
      pdf.text(line, pad, y);
      y += size * 0.48 + 1.1;
    }
    y += 3;
  }
  function heading(str: string) {
    pdf.setFont("ResearchSans", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor("#173445");
    const lines = pdf.splitTextToSize(text(str), W) as string[];
    reserve(8 + lines.length * 6);
    y += 5;
    for (const line of lines) {
      pdf.text(line, pad, y);
      y += 6;
    }
    y += 2;
  }
  function line(a: string, b: string) {
    reserve(9);
    pdf.setFontSize(9);
    pdf.setFont("ResearchSans", "normal");
    pdf.setTextColor("#30434c");
    pdf.text(text(a), pad, y);
    pdf.text(text(b), 193, y, { align: "right" });
    y += 6;
  }
  para("CEMENTLAB RESEARCH STUDIO", 10, "#287a78");
  para("Research report", 24, "#173445");
  heading(project.name);
  para("Researcher: " + (project.researcher || "Not specified"));
  para(project.description);
  para("Generated: " + new Date().toISOString() + " | Software version 1.0.0");
  para("Data appendix scope: " + scope);
  para(
    `Included observations: ${rows.length}. Synthetic: ${rows.filter((r) => r.origin === "sample").length}. Experimental: ${rows.filter((r) => r.origin === "experimental").length}. Origin is user declared, not independently verified.`,
  );
  heading("1. Mix recipes and assumptions");
  for (const m of project.mixes) {
    heading(m.id + " - " + m.name);
    para(
      `Control: ${m.control}. Added water/binder=${m.wb}; sand/binder=${m.sandRatio}; coarse/binder=${m.coarseRatio}; additional liquid/binder=${m.liquidRatio}. Assumed air=${m.air}%; waste=${m.waste}%. Sand density=${m.sandDensity}; coarse density=${m.coarseDensity}; liquid density=${m.liquidDensity} kg/m^3.`,
    );
    m.materials.forEach((a) =>
      para(
        `${a.name}: ${a.percent}% binder mass; density ${a.density} kg/m^3; role ${a.kind}.`,
        9,
      ),
    );
    para("Notes: " + m.notes, 9);
  }
  heading("2. Specimen schedule and batch quantities");
  for (const b of project.batches) {
    const v = batchVolume(b),
      m = project.mixes.find((m) => m.id === b.mixId)!;
    heading(b.group + " / " + b.mixId);
    para(
      `Purpose: ${b.purpose}; ages=${b.ages.join(", ")} days; new specimens per age=${b.destructive}; count=${v.count}; net matrix volume=${v.totalL.toFixed(6)} L. Geometry inputs (mm, quantity and kg/m^3): ${JSON.stringify(b.geometry)}`,
      9,
    );
    const q = mixQuantities(m, "volume", v.totalL);
    q.items.forEach((i) =>
      line(
        i.material,
        `${i.baseKg.toFixed(5)} kg base / ${i.withWasteKg.toFixed(5)} kg with waste`,
      ),
    );
  }
  heading("3. Saved calculation snapshots");
  if (!project.calculations.length)
    para("No standalone calculation snapshots saved.");
  for (const c of project.calculations) {
    heading(c.name);
    para(
      `Saved ${c.created}; basis=${c.mode}; target=${c.target}; saved recipe=${JSON.stringify(c.mix)}`,
      8,
    );
    mixQuantities(c.mix, c.mode, c.target).items.forEach((i) =>
      line(i.material, `${i.withWasteKg.toFixed(5)} kg including waste`),
    );
  }
  heading("4. Descriptive statistical summaries");
  para(
    "Independent groups use mix, test, age, cycle, exposure, phase, method, reference, units and data origin. SD is sample standard deviation (n-1), not uncertainty of the mean or a confidence interval.",
  );
  for (const g of groupStats(rows))
    para(
      `${g.mixId} | ${TESTS[g.test].label} | age ${g.age} d | cycle ${g.cycle ?? "not recorded"} | ${g.exposure} | phase ${g.phase || "not recorded"} | ${g.method} | electrode ${g.reference || "not applicable"} | ${g.origin}: n=${g.n}, mean=${g.mean.toPrecision(7)} ${g.unit}, SD=${g.sd === null ? "not estimable" : g.sd.toPrecision(7)}.`,
      8,
    );
  if (png) {
    const h = W * png.ratio;
    reserve(h + 45);
    heading("5. Selected plot");
    para(scope, 9);
    reserve(h + 8);
    pdf.addImage(png.data, "PNG", pad, y, W, h);
    y += h + 8;
    para(
      "Group means with sample SD for n >= 2. Individual observations and exact conditions appear in the appendix.",
      9,
    );
  }
  heading("6. Measurement appendix");
  for (const r of rows) {
    para(
      `${r.sampleId} | mix ${r.mixId} | ${TESTS[r.test].label}: ${r.value} ${r.unit}. Date ${r.date}; age ${r.age} d; exposure ${r.exposure}; phase ${r.phase || "not recorded"}; cycle ${r.cycle ?? "not recorded"}; method ${r.method}; reference ${r.reference || "not applicable"}; origin ${r.origin}; kind ${r.kind}; dataset ${r.datasetId}; record ${r.id}. Raw inputs: ${JSON.stringify(r.raw)}. Notes: ${r.notes}`,
      8,
    );
  }
  heading("7. Calculation methods");
  para(
    "Absolute volume: C = sum(fraction_i / density_i) + (water/binder)/1000 + (sand/binder)/sand_density + (coarse/binder)/coarse_density + (liquid/binder)/liquid_density. Binder kg = volume_L/1000 * (1-air/100) / C. Material mass = binder * mass fraction or ratio. Waste = base mass * (1+waste/100).",
  );
  para(
    "Specimens: cube a^3; prism L*W*H; cylinder pi*d^2*H/4; subtract embedded cylindrical steel volume. Dimensions mm; volume_L=mm^3/1,000,000. Density mass estimate = L/1000 * kg/m^3. Destructive groups require quantity times number of ages; repeated monitoring uses quantity once.",
  );
  para(
    "Strength MPa=load_kN*1000/area_mm^2. Mass change %=100*(final-initial)/initial. Length change %=100*(corrected_final-corrected_initial)/gauge_length. Absorption %=100*(saturated-dry)/dry. Current density uA/cm^2=current_uA/area_cm^2. Mean=sum/n; sample SD=sqrt(sum((x-mean)^2)/(n-1)). Change %=100*(value-baseline)/baseline; undefined if baseline=0.",
  );
  heading("8. Limitations and reproducibility");
  para(
    "Generic geometric and absolute-volume calculations are not a standard-certified mix design. Density, air, activator-water content, aggregate moisture, yield and specimen suitability need laboratory verification. No automatic reference electrode conversion, significance testing, durability ranking, alkali activator design or structural assessment is performed. One indicator does not establish overall durability. User-declared replicates must be checked for independence. Browser storage is local, may be cleared or reach quota, and does not provide shared access or institutional backup. Retain the JSON backup, raw files and approved SOP with this report.",
  );
  heading("9. Reference resources");
  for (const r of references) para(`${r.id}: ${r.title}. ${r.url}`, 8);
  para(
    `${datasetReference.title}. DOI ${datasetReference.doi}. ${datasetReference.url}. External dataset, not the sample data.`,
    8,
  );
  const count = pdf.getNumberOfPages();
  for (let i = 1; i <= count; i++) {
    pdf.setPage(i);
    pdf.setFont("ResearchSans", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor("#74848b");
    pdf.text(
      "FIFLAB | " + text(project.name).slice(0, 65),
      pad,
      290,
    );
    pdf.text(`${i} / ${count}`, 193, 290, { align: "right" });
  }
  pdf.save("cementlab-research-report.pdf");
}
