"use client"; // writes the `sort` param to the URL on change

import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Select } from "@/components/primitives";

export interface SortMessages {
  label: string;
  newest: string;
  priceAsc: string;
  priceDesc: string;
}

type Props = {
  messages: SortMessages;
};

export function SortSelect({ messages }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const current = searchParams.get("sort") ?? "newest";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value === "newest") params.delete("sort");
    else params.set("sort", value);
    params.delete("cursor"); // sort change starts back at page 1
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <Select
      label={messages.label}
      value={current}
      onChange={(e) => handleChange(e.target.value)}
      className="w-auto"
    >
      <option value="newest">{messages.newest}</option>
      <option value="price-asc">{messages.priceAsc}</option>
      <option value="price-desc">{messages.priceDesc}</option>
    </Select>
  );
}
