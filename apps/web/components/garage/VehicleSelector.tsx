"use client"; // react-query hooks + cascading select state + writes to the garage store

import { useState } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { toPersianDigits } from "schemas";
import { Select } from "@/components/primitives";
import { fetchGenerations, fetchMakes, fetchModels } from "@/lib/fetchers/vehicles";
import { useGarageStore } from "@/stores/garage-store";

type Props = {
  onSelected?: () => void;
  className?: string;
};

const CURRENT_YEAR = new Date().getFullYear();

// masterPlan.md §5 item 01 specs a 3-field "make → model → year" picker,
// but the Garage's real key needs a genId (§3.2), not a bare year -- a
// model can have multiple generations with different year ranges. This
// flattens every generation's [yearFrom, yearTo] into one sorted year
// list, then resolves the owning generation once a year is picked, so
// the user only ever sees the three fields the spec calls for.
function yearsForGenerations(
  generations: { id: string; yearFrom: number; yearTo: number | null }[],
): number[] {
  const years = new Set<number>();
  for (const gen of generations) {
    const to = gen.yearTo ?? CURRENT_YEAR;
    for (let year = gen.yearFrom; year <= to; year += 1) years.add(year);
  }
  return [...years].sort((a, b) => b - a);
}

// react-query's runtime is only ever needed once this component actually
// mounts (VehicleSelectorLazy.tsx code-splits it with `ssr:false`), so
// its QueryClientProvider lives here too -- not in the root layout -- to
// keep that cost entirely inside the lazy chunk instead of every route's
// initial JS (masterPlan.md §10's budget; see VehicleSelectorLazy.tsx's
// comment for the exact numbers this fixed). Each mounted instance (the
// hero's and the header modal's are separate) gets its own cache; that's
// an acceptable tradeoff for a 3-field picker over a ~50-row dataset.
export function VehicleSelector(props: Props) {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <VehicleSelectorFields {...props} />
    </QueryClientProvider>
  );
}

function VehicleSelectorFields({ onSelected, className = "" }: Props) {
  const [makeId, setMakeId] = useState("");
  const [modelId, setModelId] = useState("");
  const [year, setYear] = useState("");
  const addVehicle = useGarageStore((state) => state.addVehicle);

  const makesQuery = useQuery({ queryKey: ["vehicle-makes"], queryFn: fetchMakes });
  const modelsQuery = useQuery({
    queryKey: ["vehicle-models", makeId],
    queryFn: () => fetchModels(makeId),
    enabled: makeId !== "",
  });
  const generationsQuery = useQuery({
    queryKey: ["vehicle-generations", modelId],
    queryFn: () => fetchGenerations(modelId),
    enabled: modelId !== "",
  });

  const selectedMake = makesQuery.data?.find((make) => make.id === makeId);
  const selectedModel = modelsQuery.data?.find((model) => model.id === modelId);
  const years = generationsQuery.data ? yearsForGenerations(generationsQuery.data) : [];

  function handleYearChange(yearRaw: string) {
    setYear(yearRaw);
    const yearNum = Number(yearRaw);
    const generation = generationsQuery.data?.find(
      (gen) => yearNum >= gen.yearFrom && yearNum <= (gen.yearTo ?? CURRENT_YEAR),
    );
    if (!generation || !selectedMake || !selectedModel) return;

    addVehicle({
      makeId: selectedMake.id,
      modelId: selectedModel.id,
      genId: generation.id,
      year: yearNum,
      label: `${selectedMake.name.fa} ${selectedModel.name.fa} ${toPersianDigits(yearNum)}`,
    });
    onSelected?.();
  }

  return (
    <div className={`grid grid-cols-1 gap-3 sm:grid-cols-3 ${className}`}>
      <Select
        label="خودرو"
        value={makeId}
        disabled={makesQuery.isLoading}
        onChange={(event) => {
          setMakeId(event.target.value);
          setModelId("");
          setYear("");
        }}
      >
        <option value="">انتخاب کنید</option>
        {makesQuery.data?.map((make) => (
          <option key={make.id} value={make.id}>
            {make.name.fa}
          </option>
        ))}
      </Select>

      <Select
        label="مدل"
        value={modelId}
        disabled={makeId === "" || modelsQuery.isLoading}
        onChange={(event) => {
          setModelId(event.target.value);
          setYear("");
        }}
      >
        <option value="">انتخاب کنید</option>
        {modelsQuery.data?.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name.fa}
          </option>
        ))}
      </Select>

      <Select
        label="سال تولید"
        value={year}
        disabled={modelId === "" || generationsQuery.isLoading}
        onChange={(event) => handleYearChange(event.target.value)}
      >
        <option value="">انتخاب کنید</option>
        {years.map((year) => (
          <option key={year} value={year}>
            {toPersianDigits(year)}
          </option>
        ))}
      </Select>
    </div>
  );
}
