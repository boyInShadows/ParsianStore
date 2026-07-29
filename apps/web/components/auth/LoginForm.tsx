"use client"; // form state + calls the OTP endpoints + writes the auth store

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { normalizePhone, toEnglishDigits } from "schemas";
import { useRouter } from "@/i18n/navigation";
import { Button, Input } from "@/components/primitives";
import { requestOtp, verifyOtp } from "@/lib/fetchers/auth";
import { useAuthStore } from "@/stores/auth-store";
import { useCartStore } from "@/stores/cart-store";

export interface LoginFormMessages {
  phoneLabel: string;
  phonePlaceholder: string;
  phoneError: string;
  requestCodeButton: string;
  requestingCodeButton: string;
  codeLabel: string;
  codeHelper: string;
  verifyButton: string;
  verifyingButton: string;
  changePhone: string;
}

type Props = { messages: LoginFormMessages };

type Step = "phone" | "otp";

const PHONE_PATTERN = /^(\+98|0098|0)?9\d{9}$/;

export function LoginForm({ messages }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useAuthStore((state) => state.setUser);

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleRequestCode(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);

    const normalized = toEnglishDigits(phone);
    if (!PHONE_PATTERN.test(normalized)) {
      setError(messages.phoneError);
      return;
    }

    setPending(true);
    const result = await requestOtp(normalizePhone(normalized));
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setStep("otp");
  }

  async function handleVerifyCode(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);

    setPending(true);
    const result = await verifyOtp(normalizePhone(toEnglishDigits(phone)), toEnglishDigits(code));
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }

    setUser(result.data);
    // The server just merged any guest cart into this account
    // (cart.controller.ts's getCartHandler, triggered by the anonId
    // cookie this browser still carries) -- force a refetch so the
    // client sees the merged result, not the stale pre-login cart.
    void useCartStore.getState().load({ force: true });
    const next = searchParams.get("next");
    router.push(next && next.startsWith("/") ? next : "/");
  }

  if (step === "phone") {
    return (
      <form onSubmit={handleRequestCode} className="flex flex-col gap-4" noValidate>
        <Input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          label={messages.phoneLabel}
          placeholder={messages.phonePlaceholder}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          error={error ?? undefined}
          required
        />
        <Button type="submit" disabled={pending}>
          {pending ? messages.requestingCodeButton : messages.requestCodeButton}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleVerifyCode} className="flex flex-col gap-4" noValidate>
      <p className="text-body-sm text-text-muted">
        {messages.codeHelper.replace("{phone}", phone)}
      </p>
      <Input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        label={messages.codeLabel}
        value={code}
        onChange={(event) => setCode(event.target.value)}
        error={error ?? undefined}
        required
      />
      <Button type="submit" disabled={pending}>
        {pending ? messages.verifyingButton : messages.verifyButton}
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={() => {
          setStep("phone");
          setCode("");
          setError(null);
        }}
      >
        {messages.changePhone}
      </Button>
    </form>
  );
}
