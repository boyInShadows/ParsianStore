import { useId, type TextareaHTMLAttributes } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  helperText?: string;
};

export function Textarea({ label, error, helperText, id, className = "", ...rest }: Props) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const helperId = `${textareaId}-helper`;
  const errorId = `${textareaId}-error`;
  const describedBy = [error ? errorId : null, helperText ? helperId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={textareaId} className="text-body-sm font-medium text-text">
        {label}
      </label>
      <textarea
        id={textareaId}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy || undefined}
        className={`min-h-24 rounded-md border bg-surface px-3 py-2 text-body text-text placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50 ${error ? "border-danger" : "border-border"} ${className}`}
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
