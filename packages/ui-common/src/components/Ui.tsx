import type { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from "react";

export function Button({
  className = "",
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <button className={`button button--${variant} ${className}`} {...props} />
  );
}

export function Field({
  label,
  hint,
  children,
}: PropsWithChildren<{ label: string; hint?: string }>) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  );
}

export function PageTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: ReactNode;
  description: string;
}) {
  return (
    <div className="page-title">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}

export function Alert({
  type,
  children,
}: PropsWithChildren<{ type: "error" | "success" | "info" }>) {
  return (
    <div
      className={`alert alert--${type}`}
      role={type === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}

export function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}
