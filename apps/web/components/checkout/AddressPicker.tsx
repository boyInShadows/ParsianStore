"use client"; // fetches the caller's own addresses, drives the inline add-new form + selection

import { useEffect, useState } from "react";
import type { AddressDto } from "schemas";
import { Button, Radio } from "@/components/primitives";
import { fetchAddresses } from "@/lib/fetchers/addresses";
import { AddressForm, type AddressFormMessages } from "@/components/addresses/AddressForm";

export interface AddressPickerMessages extends AddressFormMessages {
  title: string;
  loading: string;
  emptyHint: string;
  addNew: string;
  radioGroupLabel: string;
}

type Props = {
  selectedId: string | null;
  onSelect: (address: AddressDto) => void;
  messages: AddressPickerMessages;
};

export function AddressPicker({ selectedId, onSelect, messages }: Props) {
  const [addresses, setAddresses] = useState<AddressDto[] | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    let active = true;
    void fetchAddresses().then((list) => {
      if (active) setAddresses(list ?? []);
    });
    return () => {
      active = false;
    };
  }, []);

  function handleCreated(address: AddressDto): void {
    setAddresses((prev) => [...(prev ?? []), address]);
    setShowForm(false);
    onSelect(address);
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-h4 font-bold text-text">{messages.title}</h2>

      {addresses === null ? (
        <p className="text-body-sm text-text-muted">{messages.loading}</p>
      ) : (
        <>
          {addresses.length === 0 && !showForm ? (
            <p className="text-body-sm text-text-muted">{messages.emptyHint}</p>
          ) : null}

          {addresses.length > 0 ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="sr-only">{messages.radioGroupLabel}</legend>
              {addresses.map((address) => (
                <div
                  key={address.id}
                  className="rounded-lg border border-border bg-surface p-3 has-[:checked]:border-brand-solid"
                >
                  <Radio
                    name="address"
                    label={`${address.receiverName} — ${address.province.name.fa}، ${address.city.name.fa}، ${address.line}`}
                    checked={selectedId === address.id}
                    onChange={() => onSelect(address)}
                  />
                </div>
              ))}
            </fieldset>
          ) : null}

          {showForm ? (
            <AddressForm
              mode="create"
              messages={messages}
              onSaved={handleCreated}
              onCancel={() => setShowForm(false)}
            />
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(true)}
              className="self-start"
            >
              {messages.addNew}
            </Button>
          )}
        </>
      )}
    </section>
  );
}
