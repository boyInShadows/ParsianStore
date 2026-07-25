import { useId, type InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
};

export function Radio({ label, id, className = "", ...rest }: Props) {
  const generatedId = useId();
  const radioId = id ?? generatedId;

  return (
    <label htmlFor={radioId} className="inline-flex items-center gap-2 text-body text-text">
      <input
        id={radioId}
        type="radio"
        className={`h-4 w-4 border-border accent-brand-solid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-50 ${className}`}
        {...rest}
      />
      {label}
    </label>
  );
}
