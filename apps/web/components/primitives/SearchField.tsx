"use client";

// Client because it owns the clear button's behaviour and reads the input's
// current value to decide whether to show it.

import { useId, useRef, useState, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./Spinner";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  /** Hides the label visually but keeps it for assistive technology. A search
   *  box next to a magnifier icon usually does not need a visible label; it
   *  always needs an accessible one. */
  hideLabel?: boolean;
  /** Shows a spinner in place of the clear button while results are in
   *  flight, and marks the field busy. */
  loading?: boolean;
  onClear?: () => void;
  clearLabel?: string;
};

/**
 * A search input: `type="search"`, a magnifier, and a clear button that
 * appears once there is something to clear.
 *
 * `type="search"` rather than `type="text"` because it is what tells a mobile
 * keyboard to offer a "search" key and a screen reader to announce the field
 * as a search box. Its native clear affordance is suppressed
 * (`[&::-webkit-search-cancel-button]:hidden`) in favour of the button below,
 * which is keyboard reachable, meets the 44px floor, and can be labelled in
 * Persian -- the native one is none of those.
 *
 * Uncontrolled-friendly: it tracks "is there text" in state purely to decide
 * whether the clear button is there, so a caller can pass `value` or not.
 */
export function SearchField({
  label,
  hideLabel = false,
  loading = false,
  onClear,
  clearLabel = "پاک کردن جستجو",
  id,
  className = "",
  onChange,
  ...rest
}: Props) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const inputRef = useRef<HTMLInputElement>(null);
  const [hasValue, setHasValue] = useState(Boolean(rest.value ?? rest.defaultValue ?? ""));

  function clear() {
    const input = inputRef.current;
    if (input) {
      input.value = "";
      // Focus returns to the field rather than being dropped on the page --
      // clearing a search is nearly always followed by typing another one.
      input.focus();
    }
    setHasValue(false);
    onClear?.();
  }

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={inputId}
        className={cn("text-body-sm font-medium text-text", hideLabel && "sr-only")}
      >
        {label}
      </label>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute inset-y-0 start-3 my-auto text-text-muted" />
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          aria-busy={loading || undefined}
          className={cn(
            // ps-12/pe-12, not ps-10: 10 is not a step in this repo's replaced
            // spacing scale, so it would emit nothing and the text would run
            // under the magnifier.
            "w-full rounded-md border border-border bg-surface py-2 pe-12 ps-12 text-body text-text",
            "placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
            "disabled:opacity-50",
            "[&::-webkit-search-cancel-button]:hidden",
            className,
          )}
          onChange={(event) => {
            setHasValue(event.target.value.length > 0);
            onChange?.(event);
          }}
          {...rest}
        />
        {loading ? (
          <Spinner
            size="sm"
            label={null}
            className="absolute inset-y-0 end-3 my-auto text-text-muted"
          />
        ) : hasValue ? (
          <button
            type="button"
            onClick={clear}
            aria-label={clearLabel}
            className={cn(
              "absolute end-0 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center",
              "text-text-muted hover:text-text",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus",
            )}
          >
            <CloseIcon />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.75" />
      <path stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" d="m20 20-3.5-3.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <path
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        d="m6 6 12 12M18 6 6 18"
      />
    </svg>
  );
}
