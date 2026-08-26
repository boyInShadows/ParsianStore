import { useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
};

export function Checkbox({ label, id, className = "", ...rest }: Props) {
  const generatedId = useId();
  const checkboxId = id ?? generatedId;

  return (
    <label htmlFor={checkboxId} className="inline-flex items-center gap-2 text-body text-text">
      <input
        id={checkboxId}
        type="checkbox"
        className={cn(
          "h-4 w-4 rounded-sm border-border accent-brand-solid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-50",
          className,
        )}
        {...rest}
      />
      {label}
    </label>
  );
}
