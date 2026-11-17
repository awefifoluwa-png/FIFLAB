export function chartSVG(id: string, description: string) {
  const container = document.getElementById(id);
  const original = container?.querySelector(
    ".recharts-wrapper > svg.recharts-surface",
  );
  if (!original) throw Error("Generate a chart before exporting.");
  const ns = "http://www.w3.org/2000/svg";
  const width = Number(original.getAttribute("width")) || 900;
  const height = Number(original.getAttribute("height")) || 330;
  const root = document.createElementNS(ns, "svg");
  root.setAttribute("xmlns", ns);
  root.setAttribute("width", String(width));
  root.setAttribute("height", String(height + 58));
  root.setAttribute("viewBox", `0 0 ${width} ${height + 58}`);
  const title = document.createElementNS(ns, "title");
  title.textContent = description;
  root.append(title);
  const bg = document.createElementNS(ns, "rect");
  bg.setAttribute("width", "100%");
  bg.setAttribute("height", "100%");
  bg.setAttribute("fill", "white");
  root.append(bg);
  const label = document.createElementNS(ns, "text");
  label.setAttribute("x", "12");
  label.setAttribute("y", "18");
  label.setAttribute("font-family", "Arial,sans-serif");
  label.setAttribute("font-size", "11");
  label.setAttribute("fill", "#173445");
  label.textContent =
    description.length > Math.floor(width / 6.5)
      ? description.slice(0, Math.floor(width / 6.5) - 1) + "…"
      : description;
  root.append(label);
  const legends = container?.querySelectorAll(".recharts-legend-item-text");
  let x = 12;
  legends?.forEach((item) => {
    const t = document.createElementNS(ns, "text");
    t.setAttribute("x", String(x));
    t.setAttribute("y", "38");
    t.setAttribute("font-family", "Arial,sans-serif");
    t.setAttribute("font-size", "11");
    t.setAttribute("fill", (item as HTMLElement).style.color || "#173445");
    t.textContent = item.textContent;
    root.append(t);
    x += Math.max(95, (item.textContent?.length || 0) * 7 + 25);
  });
  const svg = original.cloneNode(true) as SVGElement;
  svg.setAttribute("x", "0");
  svg.setAttribute("y", "58");
  root.append(svg);
  return {
    xml: new XMLSerializer().serializeToString(root),
    width,
    height: height + 58,
  };
}
