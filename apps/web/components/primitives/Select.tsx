import { useId, type ReactNode, type SelectHTMLAttributes } from "react";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  helperText?: string;
  children: ReactNode;
};

export function Select({ label, error, helperText, id, className = "", children, ...rest }: Props) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const helperId = `${selectId}-helper`;
  const errorId = `${selectId}-error`;
  const describedBy = [error ? errorId : null, helperText ? helperId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={selectId} className="text-body-sm font-medium text-text">
        {label}
      </label>
      <div className="relative">
        <select
          id={selectId}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy || undefined}
          className={`pe-9 w-full appearance-none rounded-md border bg-surface py-2 ps-3 text-body text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50 ${error ? "border-danger" : "border-border"} ${className}`}
          {...rest}
        >
          {children}
        </select>
        <ChevronIcon className="pointer-events-none absolute inset-y-0 end-3 my-auto text-text-muted" />
      </div>
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

function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" d="m6 9 6 6 6-6" />
    </svg>
  );
}
