"use client"; // controlled input + client-side navigation on submit

import { useId, useState } from "react";
import { toEnglishDigits } from "schemas";
import { useRouter } from "@/i18n/navigation";

type Props = {
  label: string;
  placeholder: string;
  hint: string;
  submit: string;
  emptyError: string;
};

/**
 * The Mechanic's above-the-fold path (2026-08-14 audit item 3): someone holding
 * the old part reads the code off it and goes straight to that part, without
 * touching the vehicle tree.
 *
 * It submits into `/search`, which is honest rather than a shortcut -- the
 * Product model folds SKU, OEM numbers and cross-reference numbers into
 * `searchText`, so a code typed here really does resolve the part it belongs
 * to. Digits are normalized to Latin first: Persian keyboards produce ۰-۹, and
 * catalogue codes are stored Latin.
 */
export function PartCodeSearch({ label, placeholder, hint, submit, emptyError }: Props) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = toEnglishDigits(code).trim();
    if (query === "") {
      setError(emptyError);
      return;
    }
    setError(null);
    router.push({ pathname: "/search", query: { q: query } });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-body-sm font-medium text-graphite-100">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={inputId}
          name="code"
          value={code}
          onChange={(event) => {
            setCode(event.target.value);
            if (error) setError(null);
          }}
          placeholder={placeholder}
          dir="ltr"
          autoComplete="off"
          aria-describedby={error ? `${hintId} ${errorId}` : hintId}
          aria-invalid={error ? true : undefined}
          className="min-w-0 flex-1 border border-graphite-700 bg-graphite-950 px-3 py-2 font-mono text-body-sm text-graphite-50 outline-none placeholder:text-graphite-500 focus-visible:border-focus focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        />
        <button
          type="submit"
          className="inline-flex min-h-12 shrink-0 items-center bg-cta px-4 text-body-sm font-bold text-cta-fg transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
        >
          {submit}
        </button>
      </div>
      <p id={hintId} className="text-caption text-graphite-400">
        {hint}
      </p>
      {error ? (
        <p id={errorId} role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : null}
    </form>
  );
}
