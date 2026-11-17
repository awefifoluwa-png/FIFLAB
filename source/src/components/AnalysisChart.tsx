import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  ErrorBar,
  ScatterChart,
  Scatter,
} from "recharts";
import type { Measurement } from "../domain/types";
import { groupStats } from "../domain/calculations";
const palette = [
  "#287a78",
  "#b07d3d",
  "#657db1",
  "#9e627c",
  "#73924e",
  "#ae5757",
  "#3f8caa",
];
export type ChartMode = "line" | "bar" | "scatter";
export default function AnalysisChart({
  rows,
  mode = "line",
  unit,
  id = "analysis-chart",
}: {
  rows: Measurement[];
  mode?: ChartMode;
  unit: string;
  id?: string;
}) {
  const groups = groupStats(rows);
  const mixes = [...new Set(rows.map((r) => r.mixId))];
  const grid = <CartesianGrid stroke="#e7edee" strokeDasharray="3 3" />;
  const y = (
    <YAxis
      width={62}
      tick={{ fontSize: 11 }}
      label={{ value: unit, angle: -90, position: "insideLeft", fontSize: 11 }}
    />
  );
  const common = { isAnimationActive: false };
  const tooltip = (
    <Tooltip
      contentStyle={{
        fontSize: 12,
        border: "1px solid #d7e2e4",
        borderRadius: 5,
      }}
    />
  );
  const table = new Map<string, Record<string, number | string>>();
  for (const g of groups) {
    const key = JSON.stringify([g.age, g.cycle]);
    if (!table.has(key))
      table.set(key, {
        age: g.age,
        cycle: g.cycle ?? "",
        label: g.age + " d" + (g.cycle === null ? "" : " · c" + g.cycle),
      });
    table.get(key)![g.mixId] = g.mean;
    table.get(key)![g.mixId + "_sd"] = g.sd ?? 0;
  }
  const data = [...table.values()].sort(
    (a, b) => Number(a.age) - Number(b.age),
  );
  return (
    <div
      className="chart-box"
      id={id}
      role="img"
      aria-label={`${mode} chart of ${unit} by age for ${mixes.join(", ")}`}
    >
      <ResponsiveContainer width="100%" height={330}>
        {mode === "bar" ? (
          <BarChart
            data={groups.map((g) => ({
              ...g,
              label:
                g.mixId +
                " · " +
                g.age +
                "d" +
                (g.cycle === null ? "" : " c" + g.cycle),
              sd: g.sd ?? 0,
            }))}
            margin={{ top: 15, right: 20, left: 5, bottom: 35 }}
          >
            {grid}
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              interval={0}
              angle={-18}
              textAnchor="end"
            />
            {y}
            {tooltip}
            <Bar
              {...common}
              dataKey="mean"
              name="Mean"
              fill={palette[0]}
              maxBarSize={45}
            >
              <ErrorBar dataKey="sd" width={5} stroke="#173445" />
            </Bar>
          </BarChart>
        ) : mode === "scatter" ? (
          <ScatterChart margin={{ top: 15, right: 20, left: 5, bottom: 20 }}>
            {grid}
            <XAxis
              type="number"
              dataKey="age"
              name="Age (days)"
              tick={{ fontSize: 11 }}
              label={{
                value: "Age / elapsed days",
                position: "insideBottom",
                offset: -13,
                fontSize: 11,
              }}
            />
            <YAxis
              width={62}
              dataKey="value"
              type="number"
              tick={{ fontSize: 11 }}
              label={{
                value: unit,
                angle: -90,
                position: "insideLeft",
                fontSize: 11,
              }}
            />
            {tooltip}
            <Legend verticalAlign="top" />
            {mixes.map((m, i) => (
              <Scatter
                {...common}
                key={m}
                name={m}
                data={rows.filter((r) => r.mixId === m)}
                fill={palette[i % palette.length]}
                dataKey="value"
              />
            ))}
          </ScatterChart>
        ) : (
          <LineChart
            data={data}
            margin={{ top: 15, right: 20, left: 5, bottom: 20 }}
          >
            {grid}
            <XAxis
              type="number"
              domain={["dataMin", "dataMax"]}
              dataKey="age"
              tick={{ fontSize: 11 }}
              label={{
                value: "Age / elapsed days",
                position: "insideBottom",
                offset: -13,
                fontSize: 11,
              }}
            />
            {y}
            {tooltip}
            <Legend verticalAlign="top" />
            {mixes.map((m, i) => (
              <Line
                {...common}
                key={m}
                dataKey={m}
                name={m}
                stroke={palette[i % palette.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              >
                <ErrorBar
                  dataKey={m + "_sd"}
                  width={4}
                  stroke={palette[i % palette.length]}
                />
              </Line>
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
