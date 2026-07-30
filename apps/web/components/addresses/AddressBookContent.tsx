"use client"; // list + add/edit/delete mutations, client-side auth gate

import { useEffect, useState } from "react";
import type { AddressDto } from "schemas";
import { useRouter } from "@/i18n/navigation";
import { Button, EmptyState } from "@/components/primitives";
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
      <h1 className="font-display text-h2 font-black text-text">{messages.title}</h1>

      {addresses === null ? (
        <p className="text-body-sm text-text-muted">{messages.loading}</p>
      ) : (
        <>
          {addresses.length === 0 && formState.type === "none" ? (
            <EmptyState title={messages.emptyTitle} description={messages.emptyDescription} />
          ) : null}

          <ul className="flex flex-col gap-3">
            {addresses.map((address) =>
              formState.type === "edit" && formState.address.id === address.id ? (
                <li key={address.id}>
                  <AddressForm
                    mode="edit"
                    address={address}
                    messages={messages}
                    onSaved={handleSaved}
                    onCancel={() => setFormState({ type: "none" })}
                  />
                </li>
              ) : (
                <li
                  key={address.id}
                  className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-body-sm text-text">{address.receiverName}</span>
                    <span className="font-mono text-caption text-text-muted">
                      {address.receiverPhone}
                    </span>
                    <span className="text-body-sm text-text-muted">
                      {address.province.name.fa}، {address.city.name.fa}، {address.line}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      aria-label={messages.editAria}
                      onClick={() => setFormState({ type: "edit", address })}
                    >
                      {messages.editAria}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label={messages.deleteAria}
                      disabled={deletingId === address.id}
                      onClick={() => void handleDelete(address.id)}
                      className="text-danger"
                    >
                      {messages.deleteAria}
                    </Button>
                  </div>
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
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormState({ type: "add" })}
              className="self-start"
            >
              {messages.addNew}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
