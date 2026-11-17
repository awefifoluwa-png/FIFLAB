import type { ReactNode } from "react";
import type { Project } from "../domain/types";
export type ModuleProps = {
  project: Project;
  update: (fn: (p: Project) => Project) => void;
  notify: (message: string) => void;
  go: (tab: string) => void;
};
export const fmt = (v: number | null | undefined, digits = 3) =>
  v === null || v === undefined
    ? "—"
    : new Intl.NumberFormat("en-CA", { maximumFractionDigits: digits }).format(
        v,
      );
export function Panel({
  title,
  description,
  children,
  action,
  className = "",
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={"panel " + className}>
      {(title || action) && (
        <div className="panel-heading">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>
        {label}
        {help && (
          <span className="help" title={help} aria-label={help}>
            ?
          </span>
        )}
      </span>
      {children}
    </label>
  );
}
export function Num({
  value,
  onChange,
  min,
  step = "any",
  ...props
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  step?: number | "any";
  "aria-label"?: string;
  disabled?: boolean;
}) {
  return (
    <input
      type="number"
      value={Number.isNaN(value) ? "" : value}
      min={min}
      step={step}
      onChange={(e) =>
        onChange(e.target.value === "" ? NaN : Number(e.target.value))
      }
      {...props}
    />
  );
}
export function ErrorBox({ message }: { message: string }) {
  return message ? (
    <div role="alert" className="error-box">
      {message}
    </div>
  ) : null;
}
export function Note({ children }: { children: ReactNode }) {
  return <div className="note">{children}</div>;
}
export function Badge({
  children,
  tone = "grey",
}: {
  children: ReactNode;
  tone?: "grey" | "teal" | "amber";
}) {
  return <span className={"badge " + tone}>{children}</span>;
}
export function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
}) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}
export const describeError = (e: unknown) =>
  e instanceof Error ? e.message : "The operation could not be completed.";
export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
export function Table({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
