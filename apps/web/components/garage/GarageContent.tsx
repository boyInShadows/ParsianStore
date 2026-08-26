"use client"; // reads/writes the cookie-backed garage store, add/remove UI state

import { useState } from "react";
import { buildVehicleKey, toPersianDigits } from "schemas";
import { Button, Card, Badge, EmptyState } from "@/components/primitives";
import { VehicleSelectorLazy } from "@/components/garage";
import { useGarageStore } from "@/stores/garage-store";

export interface GarageMessages {
  title: string;
  itemCount: string;
  emptyTitle: string;
  emptyDescription: string;
  activeBadge: string;
  setActiveButton: string;
  removeAria: string;
  addVehicleButton: string;
  cancel: string;
}

function CarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 16v-3l2-5h12l2 5v3M4 16h16M4 16v2M20 16v2M7 16v0M17 16v0"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"
      />
    </svg>
  );
}

// Interpolated `t()` calls with format() (ICU {count}) aren't available
// from the plain t() signature this file receives -- messages are passed
// pre-resolved strings from the Server Component instead (same pattern
// AddressBookContent/AdminOrdersListContent use), except itemCount which
// needs the real count -- resolved here via a simple replace, matching
// how this codebase already avoids pulling next-intl's client runtime
// into a component that otherwise needs none of it.
function formatItemCount(template: string, count: number): string {
  return template.replace("{count}", toPersianDigits(count));
}

export function GarageContent({ messages }: { messages: GarageMessages }) {
  const vehicles = useGarageStore((state) => state.vehicles);
  const activeKey = useGarageStore((state) => state.activeKey);
  const removeVehicle = useGarageStore((state) => state.removeVehicle);
  const setActive = useGarageStore((state) => state.setActive);
  const [adding, setAdding] = useState(false);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-h2 font-black text-text">{messages.title}</h1>
        {vehicles.length > 0 ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-info bg-surface px-3 py-1 text-body-sm font-medium text-info">
            {formatItemCount(messages.itemCount, vehicles.length)}
          </span>
        ) : null}
      </div>

      {vehicles.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<CarIcon />}
            title={messages.emptyTitle}
            description={messages.emptyDescription}
          />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((vehicle) => {
            const key = buildVehicleKey(vehicle);
            const isActive = key === activeKey;
            return (
              <Card
                key={key}
                className={isActive ? "border-brand-solid ring-1 ring-brand-solid" : undefined}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-raised text-text-muted"
                    >
                      <CarIcon />
                    </span>
                    <span className="text-body-sm font-medium text-text">{vehicle.label}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeVehicle(key)}
                    aria-label={`${messages.removeAria}: ${vehicle.label}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    <TrashIcon />
                  </button>
                </div>
                <div className="mt-3">
                  {isActive ? (
                    <Badge tone="brand">{messages.activeBadge}</Badge>
                  ) : (
                    <Button variant="ghost" onClick={() => setActive(key)}>
                      {messages.setActiveButton}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-6">
        {adding ? (
          <Card>
            <VehicleSelectorLazy onSelected={() => setAdding(false)} />
            <div className="mt-3">
              <Button variant="ghost" onClick={() => setAdding(false)}>
                {messages.cancel}
              </Button>
            </div>
          </Card>
        ) : (
          <Button variant="brand" onClick={() => setAdding(true)}>
            {messages.addVehicleButton}
          </Button>
        )}
      </div>
    </div>
  );
}
