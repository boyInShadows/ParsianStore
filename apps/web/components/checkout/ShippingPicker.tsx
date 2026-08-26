"use client"; // fetches shipping options for the selected address, drives selection

import { useEffect, useState } from "react";
import { formatToman, type ShippingOptionDto } from "schemas";
import { Radio } from "@/components/primitives";
import { estimateShipping } from "@/lib/fetchers/checkout";

export interface ShippingPickerMessages {
  title: string;
  loading: string;
  emptyHint: string;
  errorHint: string;
  radioGroupLabel: string;
}

type Props = {
  addressId: string;
  selectedCode: string | null;
  onSelect: (option: ShippingOptionDto) => void;
  messages: ShippingPickerMessages;
};

// The caller mounts this with `key={addressId}` (CheckoutPageContent) --
// a new address means a full remount, not a manual state reset inside
// this effect, so `options`/`hasError` always start fresh without this
// component needing to clear them itself.
export function ShippingPicker({ addressId, selectedCode, onSelect, messages }: Props) {
  const [options, setOptions] = useState<ShippingOptionDto[] | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    void estimateShipping(addressId).then((result) => {
      if (!active) return;
      if (!result.ok) {
        setHasError(true);
        return;
      }
      setOptions(result.data.options);
    });
    return () => {
      active = false;
    };
  }, [addressId]);

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-6">
      <h2 className="border-b border-rule pb-3 text-h3 font-bold text-text">{messages.title}</h2>
      {hasError ? (
        <p role="alert" className="text-body-sm text-danger">
          {messages.errorHint}
        </p>
      ) : options === null ? (
        <p className="text-body-sm text-text-muted">{messages.loading}</p>
      ) : options.length === 0 ? (
        <p className="text-body-sm text-text-muted">{messages.emptyHint}</p>
      ) : (
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">{messages.radioGroupLabel}</legend>
          {options.map((option) => (
            <div
              key={option.methodCode}
              className="flex items-center justify-between rounded-lg border border-border bg-surface-raised p-4 transition-colors has-[:checked]:border-brand-solid has-[:checked]:bg-brand-subtle motion-reduce:transition-none"
            >
              <Radio
                name="shipping"
                label={option.name.fa}
                checked={selectedCode === option.methodCode}
                onChange={() => onSelect(option)}
              />
              <span className="font-mono text-body-sm font-bold text-price">
                {formatToman(option.priceRial)}
              </span>
            </div>
          ))}
        </fieldset>
      )}
    </section>
  );
}
