"use client";

// Client Component because profile editing needs controlled form state and submission feedback.
import { useState, type FormEvent } from "react";
import type { MeDto } from "schemas";
import { Button, Input } from "@/components/primitives";
import { updateProfile } from "@/lib/fetchers/auth";
import { useAuthStore } from "@/stores/auth-store";

export type ProfileFormMessages = {
  nameLabel: string;
  emailLabel: string;
  emailOptional: string;
  phoneLabel: string;
  phoneHelper: string;
  save: string;
  saving: string;
  success: string;
  error: string;
  nameError: string;
  emailError: string;
};

export function ProfileForm({ user, messages }: { user: MeDto; messages: ProfileFormMessages }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email ?? "");
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const setUser = useAuthStore((state) => state.setUser);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: { name?: string; email?: string } = {};
    if (name.trim().length < 2) nextErrors.name = messages.nameError;
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim()))
      nextErrors.email = messages.emailError;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setStatus("saving");
    const result = await updateProfile({ name: name.trim(), email: email.trim() });
    if (!result.ok) {
      setStatus("error");
      return;
    }
    setUser(result.data);
    setName(result.data.name);
    setEmail(result.data.email ?? "");
    setStatus("success");
  }

  return (
    <form onSubmit={handleSubmit} className="gap-5 flex max-w-2xl flex-col" noValidate>
      <Input
        label={messages.nameLabel}
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={errors.name}
        autoComplete="name"
        maxLength={80}
        required
      />
      <Input
        label={`${messages.emailLabel} (${messages.emailOptional})`}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={errors.email}
        type="email"
        inputMode="email"
        autoComplete="email"
        dir="ltr"
      />
      <Input
        label={messages.phoneLabel}
        value={user.phone}
        helperText={messages.phoneHelper}
        dir="ltr"
        disabled
      />
      {status === "success" ? (
        <p role="status" className="text-body-sm text-text">
          {messages.success}
        </p>
      ) : status === "error" ? (
        <p role="alert" className="text-body-sm text-danger">
          {messages.error}
        </p>
      ) : null}
      <Button type="submit" className="self-start" disabled={status === "saving"}>
        {status === "saving" ? messages.saving : messages.save}
      </Button>
    </form>
  );
}
