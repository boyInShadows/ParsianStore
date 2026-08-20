"use client"; // interactive filter controls write to the URL on every change

import { useSearchParams } from "next/navigation";
import type { FacetsResponse } from "schemas";
import { selectActiveVehicle, useGarageStore } from "@/stores/garage-store";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { Checkbox, Chip, Radio } from "@/components/primitives";

type Facets = FacetsResponse["data"] | null;

// Passed as a plain object rather than calling next-intl's useTranslations
// client-side -- P4.S4 found that hook alone can push a thin route budget
// over its ceiling (found in the landing Shop-by-system grid, deleted at
// P9.S9 once the rebuilt hero's index rail covered its destinations);
// the PLP route's own 160KB ceiling (masterPlan.md §10) is tighter than
// landing's, so the same avoidance applies here from the start rather
// than being discovered the hard way again.
export interface FilterBarMessages {
  category: string;
  brand: string;
  price: string;
  priceMin: string;
  priceMax: string;
  inStock: string;
  fitsMyVehicle: string;
  fitsMyVehicleHint: string;
  noActiveVehicle: string;
  clearAll: string;
  removeFilter: string;
}

type Props = {
  facets: Facets;
  childCategories: { slug: string; label: string }[];
  categoryOptions?: { slug: string; label: string; count: number }[];
  showBrandFilter?: boolean;
  messages: FilterBarMessages;
};

const ALL_ATTRIBUTE_KEYS_SEP = ",";

function parseAttributesParam(raw: string | null): Map<string, string> {
  const map = new Map<string, string>();
  if (!raw) return map;
  for (const pair of raw.split(ALL_ATTRIBUTE_KEYS_SEP)) {
    const [key, value] = pair.split(":");
    if (key && value) map.set(key, value);
  }
  return map;
}

function serializeAttributes(map: Map<string, string>): string | undefined {
  if (map.size === 0) return undefined;
  return [...map.entries()].map(([key, value]) => `${key}:${value}`).join(ALL_ATTRIBUTE_KEYS_SEP);
}

export function FilterBar({
  facets,
  childCategories,
  categoryOptions = [],
  showBrandFilter = true,
  messages,
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const activeVehicle = useGarageStore(selectActiveVehicle);

  const currentBrand = searchParams.get("brand");
  const currentCategory = searchParams.get("category");
  const currentMin = searchParams.get("minPriceRial") ?? "";
  const currentMax = searchParams.get("maxPriceRial") ?? "";
  const inStockOnly = searchParams.get("inStock") === "true";
  const fitsVehicleOff = searchParams.get("fits") === "0";
  const attributeSelections = parseAttributesParam(searchParams.get("attributes"));

  const hasActiveFilters =
    Boolean(currentBrand) ||
    Boolean(currentCategory) ||
    Boolean(currentMin) ||
    Boolean(currentMax) ||
    inStockOnly ||
    attributeSelections.size > 0;

  function updateParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams);
    mutate(params);
    params.delete("cursor"); // any filter change starts back at page 1
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function toggleBrand(slug: string) {
    updateParams((params) => {
      if (currentBrand === slug) params.delete("brand");
      else params.set("brand", slug);
    });
  }

  function toggleCategory(slug: string) {
    updateParams((params) => {
      if (currentCategory === slug) params.delete("category");
      else params.set("category", slug);
    });
  }

  function applyPriceRange(min: string, max: string) {
    updateParams((params) => {
      if (min) params.set("minPriceRial", min);
      else params.delete("minPriceRial");
      if (max) params.set("maxPriceRial", max);
      else params.delete("maxPriceRial");
    });
  }

  function toggleInStock() {
    updateParams((params) => {
      if (inStockOnly) params.delete("inStock");
      else params.set("inStock", "true");
    });
  }

  function toggleFitsVehicle() {
    updateParams((params) => {
      if (fitsVehicleOff) params.delete("fits");
      else params.set("fits", "0");
    });
  }

  function toggleAttribute(key: string, value: string) {
    updateParams((params) => {
      const next = new Map(attributeSelections);
      if (next.get(key) === value) next.delete(key);
      else next.set(key, value);
      const serialized = serializeAttributes(next);
      if (serialized) params.set("attributes", serialized);
      else params.delete("attributes");
    });
  }

  function clearAll() {
    router.push(pathname, { scroll: false });
  }

  const attributeGroups = new Map<string, { keyLabel: string; value: string; count: number }[]>();
  for (const bucket of facets?.attributes ?? []) {
    const group = attributeGroups.get(bucket.key) ?? [];
    group.push({ keyLabel: bucket.keyLabel, value: bucket.value, count: bucket.count });
    attributeGroups.set(bucket.key, group);
  }

  return (
    <div className="flex flex-col gap-6">
      {hasActiveFilters ? (
        <div className="flex flex-wrap gap-2">
          {currentBrand ? (
            <Chip onRemove={() => toggleBrand(currentBrand)} removeLabel={messages.removeFilter}>
              {facets?.brands.find((b) => b.slug === currentBrand)?.name.fa ?? currentBrand}
            </Chip>
          ) : null}
          {currentCategory ? (
            <Chip
              onRemove={() => toggleCategory(currentCategory)}
              removeLabel={messages.removeFilter}
            >
              {categoryOptions.find((category) => category.slug === currentCategory)?.label ??
                currentCategory}
            </Chip>
          ) : null}
          {inStockOnly ? (
            <Chip onRemove={toggleInStock} removeLabel={messages.removeFilter}>
              {messages.inStock}
            </Chip>
          ) : null}
          {[...attributeSelections.entries()].map(([key, value]) => (
            <Chip
              key={key}
              onRemove={() => toggleAttribute(key, value)}
              removeLabel={messages.removeFilter}
            >
              {value}
            </Chip>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="text-body-sm text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            {messages.clearAll}
          </button>
        </div>
      ) : null}

      {childCategories.length > 0 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-body-sm font-medium text-text">{messages.category}</legend>
          {childCategories.map((child) => (
            <Link
              key={child.slug}
              href={`/c/${child.slug}`}
              className="text-body-sm text-text-muted hover:text-brand hover:underline"
            >
              {child.label}
            </Link>
          ))}
        </fieldset>
      ) : null}

      {categoryOptions.length > 0 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-body-sm font-medium text-text">{messages.category}</legend>
          {categoryOptions.map((category) => (
            <Radio
              key={category.slug}
              name="category"
              label={`${category.label} (${category.count})`}
              checked={currentCategory === category.slug}
              onChange={() => toggleCategory(category.slug)}
            />
          ))}
        </fieldset>
      ) : null}

      {activeVehicle ? (
        <fieldset className="flex flex-col gap-1">
          <Checkbox
            label={messages.fitsMyVehicle}
            checked={!fitsVehicleOff}
            onChange={toggleFitsVehicle}
          />
          <p className="ps-6 text-caption text-text-muted">{messages.fitsMyVehicleHint}</p>
        </fieldset>
      ) : null}

      {showBrandFilter && facets && facets.brands.length > 0 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-body-sm font-medium text-text">{messages.brand}</legend>
          {facets.brands.map((brand) => (
            <Radio
              key={brand.id}
              name="brand"
              label={`${brand.name.fa} (${brand.count})`}
              checked={currentBrand === brand.slug}
              onChange={() => toggleBrand(brand.slug)}
            />
          ))}
        </fieldset>
      ) : null}

      <fieldset className="flex flex-col gap-2">
        <legend className="text-body-sm font-medium text-text">{messages.price}</legend>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            defaultValue={currentMin}
            placeholder={messages.priceMin}
            aria-label={messages.priceMin}
            onBlur={(e) => applyPriceRange(e.currentTarget.value, currentMax)}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-body-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          />
          <span aria-hidden="true" className="text-text-muted">
            –
          </span>
          <input
            type="number"
            min={0}
            defaultValue={currentMax}
            placeholder={messages.priceMax}
            aria-label={messages.priceMax}
            onBlur={(e) => applyPriceRange(currentMin, e.currentTarget.value)}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-body-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          />
        </div>
      </fieldset>

      <Checkbox label={messages.inStock} checked={inStockOnly} onChange={toggleInStock} />

      {showBrandFilter
        ? [...attributeGroups.entries()].map(([key, values]) => (
            <fieldset key={key} className="flex flex-col gap-2">
              <legend className="text-body-sm font-medium text-text">{values[0]?.keyLabel}</legend>
              {values.map((option) => (
                <Radio
                  key={option.value}
                  name={`attr-${key}`}
                  label={`${option.value} (${option.count})`}
                  checked={attributeSelections.get(key) === option.value}
                  onChange={() => toggleAttribute(key, option.value)}
                />
              ))}
            </fieldset>
          ))
        : null}
    </div>
  );
}
