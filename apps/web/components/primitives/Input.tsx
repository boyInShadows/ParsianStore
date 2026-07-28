import { useId, type InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  helperText?: string;
};

export function Input({ label, error, helperText, id, className = "", ...rest }: Props) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;
  const describedBy = [error ? errorId : null, helperText ? helperId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-body-sm font-medium text-text">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy || undefined}
        className={`rounded-md border bg-surface px-3 py-2 text-body text-text placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50 ${error ? "border-danger" : "border-border"} ${className}`}
        {...rest}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-body-sm text-danger">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-body-sm text-text-muted">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
