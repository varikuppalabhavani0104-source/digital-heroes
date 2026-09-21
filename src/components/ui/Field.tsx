import type { InputHTMLAttributes } from "react";

/** Labelled input with inline error — accessible (aria-invalid / aria-describedby). */
export function Field({ label, error, id, hint, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string; id: string }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <input id={id} name={id} className="input" aria-invalid={!!error} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined} {...rest} />
      {hint && !error && <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-500">{hint}</p>}
      {error && <p id={`${id}-err`} role="alert" className="mt-1.5 text-sm text-danger">{error}</p>}
    </div>
  );
}
