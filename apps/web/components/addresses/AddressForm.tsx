"use client"; // province->city cascade + form state + calls the address fetchers

import { useState, type FormEvent } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import type { AddressDto } from "schemas";
import { Button, Input, Select } from "@/components/primitives";
import { createAddress, updateAddress, type CreateAddressInput } from "@/lib/fetchers/addresses";
import { fetchCities, fetchProvinces } from "@/lib/fetchers/geo";

// Shared between checkout/AddressPicker.tsx (create-only, embedded in a
// bigger picker) and the real address-book page (P7.S2, create + edit) --
// pulled out once real duplication existed, not speculatively.
export interface AddressFormMessages {
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
  cancel: string;
}

type Props = {
  messages: AddressFormMessages;
  onSaved: (address: AddressDto) => void;
  onCancel: () => void;
} & ({ mode: "create" } | { mode: "edit"; address: AddressDto });

function formValuesFrom(address?: AddressDto): {
  provinceId: string;
  cityId: string;
  line: string;
  postalCode: string;
  plate: string;
  unit: string;
  receiverName: string;
  receiverPhone: string;
} {
  if (!address) {
    return {
      provinceId: "",
      cityId: "",
      line: "",
      postalCode: "",
      plate: "",
      unit: "",
      receiverName: "",
      receiverPhone: "",
    };
  }
  return {
    provinceId: address.province.id,
    cityId: address.city.id,
    line: address.line,
    postalCode: address.postalCode,
    plate: address.plate ?? "",
    unit: address.unit ?? "",
    receiverName: address.receiverName,
    receiverPhone: address.receiverPhone,
  };
}

// react-query's runtime only needs to exist once this component actually
// mounts -- its own QueryClientProvider, same scoping reasoning
// VehicleSelector.tsx (P4.S3) already established.
export function AddressForm(props: Props) {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <AddressFormFields {...props} />
    </QueryClientProvider>
  );
}

function AddressFormFields(props: Props) {
  const { messages, onSaved, onCancel } = props;
  const initial = formValuesFrom(props.mode === "edit" ? props.address : undefined);

  const [provinceId, setProvinceId] = useState(initial.provinceId);
  const [cityId, setCityId] = useState(initial.cityId);
  const [line, setLine] = useState(initial.line);
  const [postalCode, setPostalCode] = useState(initial.postalCode);
  const [plate, setPlate] = useState(initial.plate);
  const [unit, setUnit] = useState(initial.unit);
  const [receiverName, setReceiverName] = useState(initial.receiverName);
  const [receiverPhone, setReceiverPhone] = useState(initial.receiverPhone);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const provincesQuery = useQuery({
    queryKey: ["address-form-provinces"],
    queryFn: fetchProvinces,
  });
  const citiesQuery = useQuery({
    queryKey: ["address-form-cities", provinceId],
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
    const result =
      props.mode === "edit"
        ? await updateAddress(props.address.id, input)
        : await createAddress(input);
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onSaved(result.data);
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
