"use client"; // fetches the caller's own addresses, drives the inline add-new form + selection

import { useEffect, useState, type FormEvent } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import type { AddressDto } from "schemas";
import { Button, Input, Radio, Select } from "@/components/primitives";
import { createAddress, fetchAddresses, type CreateAddressInput } from "@/lib/fetchers/addresses";
import { fetchCities, fetchProvinces } from "@/lib/fetchers/geo";

export interface AddressPickerMessages {
  title: string;
  loading: string;
  emptyHint: string;
  addNew: string;
  cancel: string;
  provinceLabel: string;
  cityLabel: string;
  selectPlaceholder: string;
  lineLabel: string;
  postalCodeLabel: string;
  plateLabel: string;
  unitLabel: string;
  receiverNameLabel: string;
  receiverPhoneLabel: string;
  saveButton: string;
  savingButton: string;
  radioGroupLabel: string;
}

type Props = {
  selectedId: string | null;
  onSelect: (address: AddressDto) => void;
  messages: AddressPickerMessages;
};

// react-query's runtime only needs to exist once this component actually
// mounts on the checkout page -- its own QueryClientProvider, same
// scoping reasoning VehicleSelector.tsx (P4.S3) already established,
// shared here by both the province->city cascade in AddressForm and any
// future query this picker adds.
export function AddressPicker(props: Props) {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <AddressPickerInner {...props} />
    </QueryClientProvider>
  );
}

function AddressPickerInner({ selectedId, onSelect, messages }: Props) {
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
              messages={messages}
              onCreated={handleCreated}
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

function AddressForm({
  messages,
  onCreated,
  onCancel,
}: {
  messages: AddressPickerMessages;
  onCreated: (address: AddressDto) => void;
  onCancel: () => void;
}) {
  const [provinceId, setProvinceId] = useState("");
  const [cityId, setCityId] = useState("");
  const [line, setLine] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [plate, setPlate] = useState("");
  const [unit, setUnit] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const provincesQuery = useQuery({ queryKey: ["checkout-provinces"], queryFn: fetchProvinces });
  const citiesQuery = useQuery({
    queryKey: ["checkout-cities", provinceId],
    queryFn: () => fetchCities(provinceId),
    enabled: provinceId !== "",
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const input: CreateAddressInput = {
      provinceId,
      cityId,
      line,
      postalCode,
      plate: plate || undefined,
      unit: unit || undefined,
      receiverName,
      receiverPhone,
    };
    const result = await createAddress(input);
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onCreated(result.data);
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4"
      noValidate
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select
          label={messages.provinceLabel}
          value={provinceId}
          required
          disabled={provincesQuery.isLoading}
          onChange={(event) => {
            setProvinceId(event.target.value);
            setCityId("");
          }}
        >
          <option value="">{messages.selectPlaceholder}</option>
          {provincesQuery.data?.map((province) => (
            <option key={province.id} value={province.id}>
              {province.name.fa}
            </option>
          ))}
        </Select>
        <Select
          label={messages.cityLabel}
          value={cityId}
          required
          disabled={provinceId === "" || citiesQuery.isLoading}
          onChange={(event) => setCityId(event.target.value)}
        >
          <option value="">{messages.selectPlaceholder}</option>
          {citiesQuery.data?.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name.fa}
            </option>
          ))}
        </Select>
      </div>

      <Input
        label={messages.lineLabel}
        value={line}
        required
        onChange={(event) => setLine(event.target.value)}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Input
          label={messages.postalCodeLabel}
          value={postalCode}
          required
          inputMode="numeric"
          maxLength={10}
          onChange={(event) => setPostalCode(event.target.value)}
        />
        <Input
          label={messages.plateLabel}
          value={plate}
          onChange={(event) => setPlate(event.target.value)}
        />
        <Input
          label={messages.unitLabel}
          value={unit}
          onChange={(event) => setUnit(event.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          label={messages.receiverNameLabel}
          value={receiverName}
          required
          onChange={(event) => setReceiverName(event.target.value)}
        />
        <Input
          label={messages.receiverPhoneLabel}
          value={receiverPhone}
          required
          type="tel"
          inputMode="tel"
          onChange={(event) => setReceiverPhone(event.target.value)}
        />
      </div>

      {error ? (
        <p role="alert" className="text-body-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" variant="brand" disabled={saving}>
          {saving ? messages.savingButton : messages.saveButton}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {messages.cancel}
        </Button>
      </div>
    </form>
  );
}
