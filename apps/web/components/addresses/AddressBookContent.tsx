"use client"; // list + add/edit/delete mutations, client-side auth gate

import { useEffect, useState } from "react";
import type { AddressDto } from "schemas";
import { useRouter } from "@/i18n/navigation";
import { Button, Card, EmptyState, Skeleton } from "@/components/primitives";
// By file path, not the barrel -- see primitives/index.ts.
import { PageHeader } from "@/components/primitives/PageHeader";
import { DataRow } from "@/components/primitives/DataRow";
import { useAuthStore } from "@/stores/auth-store";
import { useToastStore } from "@/stores/toast-store";
import { deleteAddress, fetchAddresses } from "@/lib/fetchers/addresses";
import { AddressForm, type AddressFormMessages } from "./AddressForm";

export interface AddressBookMessages extends AddressFormMessages {
  title: string;
  loading: string;
  emptyTitle: string;
  emptyDescription: string;
  addNew: string;
  editAria: string;
  deleteAria: string;
  deleteError: string;
}

type FormState = { type: "none" } | { type: "add" } | { type: "edit"; address: AddressDto };

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"
      />
    </svg>
  );
}

// Client-side auth gate, same pattern CheckoutPageContent.tsx (P6.S6)
// already established -- this page is interactive (add/edit/delete),
// unlike /orders' read-only pages (P7.S1), which justified a
// server-side gate instead. This page gains nothing from being a Server
// Component since it needs client state regardless.
export function AddressBookContent({ messages }: { messages: AddressBookMessages }) {
  const router = useRouter();
  const authStatus = useAuthStore((state) => state.status);
  const showToast = useToastStore((state) => state.show);

  const [addresses, setAddresses] = useState<AddressDto[] | null>(null);
  const [formState, setFormState] = useState<FormState>({ type: "none" });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus === "guest") {
      router.push("/auth/login?next=/addresses");
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    let active = true;
    void fetchAddresses().then((list) => {
      if (active) setAddresses(list ?? []);
    });
    return () => {
      active = false;
    };
  }, [authStatus]);

  function handleSaved(address: AddressDto): void {
    setAddresses((prev) => {
      const list = prev ?? [];
      const exists = list.some((a) => a.id === address.id);
      return exists ? list.map((a) => (a.id === address.id ? address : a)) : [...list, address];
    });
    setFormState({ type: "none" });
  }

  async function handleDelete(id: string): Promise<void> {
    setDeletingId(id);
    const result = await deleteAddress(id);
    setDeletingId(null);
    if (!result.ok) {
      showToast(messages.deleteError, "danger");
      return;
    }
    setAddresses((prev) => (prev ?? []).filter((a) => a.id !== id));
  }

  if (authStatus === "idle" || authStatus === "loading" || authStatus === "guest") return null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        code="ADR"
        title={messages.title}
        actions={
          formState.type === "add" ? null : (
            <Button type="button" onClick={() => setFormState({ type: "add" })}>
              {messages.addNew}
            </Button>
          )
        }
      />

      {addresses === null ? (
        // Was a bare <p> of loading text, so the list popped in. Skeletons
        // in the real grid shape hold the layout instead.
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      ) : (
        <>
          {addresses.length === 0 && formState.type === "none" ? (
            <EmptyState title={messages.emptyTitle} description={messages.emptyDescription} />
          ) : null}

          {/* An address IS one entity, so these are Cards in a grid, not
              Sheet rows -- the data-card vs. data-row distinction. They
              were flat full-width bordered rows identical to /orders'. */}
          <ul className="grid gap-4 md:grid-cols-2">
            {addresses.map((address) =>
              formState.type === "edit" && formState.address.id === address.id ? (
                <li key={address.id} className="md:col-span-2">
                  <AddressForm
                    mode="edit"
                    address={address}
                    messages={messages}
                    onSaved={handleSaved}
                    onCancel={() => setFormState({ type: "none" })}
                  />
                </li>
              ) : (
                <li key={address.id}>
                  <Card interactive className="flex h-full flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-body font-medium text-text">
                          {address.receiverName}
                        </span>
                        <span className="font-mono text-caption text-text-muted">
                          {address.receiverPhone}
                        </span>
                      </div>
                      {/* Destruction stops shouting: it was a full-width
                          text button as loud as the address itself. */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={messages.deleteAria}
                        disabled={deletingId === address.id}
                        onClick={() => void handleDelete(address.id)}
                        className="shrink-0 text-text-muted hover:text-danger"
                      >
                        <TrashIcon />
                      </Button>
                    </div>

                    {/* The page rendered strictly less than the data had:
                        postalCode, plate and unit are all on AddressDto and
                        none of them were shown, while the order detail page
                        showed the postal code from its own snapshot. */}
                    <div className="flex flex-col gap-2">
                      <DataRow
                        label={messages.provinceLabel}
                        value={`${address.province.name.fa}، ${address.city.name.fa}`}
                      />
                      <DataRow label={messages.lineLabel} value={address.line} />
                      <DataRow label={messages.postalCodeLabel} value={address.postalCode} mono />
                      {address.plate || address.unit ? (
                        <DataRow
                          label={`${messages.plateLabel} / ${messages.unitLabel}`}
                          value={[address.plate, address.unit].filter(Boolean).join(" / ")}
                          mono
                        />
                      ) : null}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormState({ type: "edit", address })}
                      className="mt-auto self-start"
                    >
                      {messages.editAria}
                    </Button>
                  </Card>
                </li>
              ),
            )}
          </ul>

          {formState.type === "add" ? (
            <AddressForm
              mode="create"
              messages={messages}
              onSaved={handleSaved}
              onCancel={() => setFormState({ type: "none" })}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
