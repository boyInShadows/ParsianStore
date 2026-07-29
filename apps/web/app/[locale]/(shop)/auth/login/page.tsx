import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LoginForm, type LoginFormMessages } from "@/components/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.login");
  return {
    title: t("title"),
    // A sign-in form has nothing worth ranking -- not part of §10's SEO surface.
    robots: { index: false, follow: false },
  };
}

export default async function LoginPage() {
  const t = await getTranslations("Auth.login");
  const messages: LoginFormMessages = {
    phoneLabel: t("phoneLabel"),
    phonePlaceholder: t("phonePlaceholder"),
    phoneError: t("phoneError"),
    requestCodeButton: t("requestCodeButton"),
    requestingCodeButton: t("requestingCodeButton"),
    codeLabel: t("codeLabel"),
    codeHelper: t("codeHelper"),
    verifyButton: t("verifyButton"),
    verifyingButton: t("verifyingButton"),
    changePhone: t("changePhone"),
  };

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <h1 className="font-display text-h2 font-black text-text">{t("title")}</h1>
      {/* useSearchParams() inside LoginForm (for ?next=) needs a Suspense
          boundary, same requirement GarageUrlSync has at the layout level. */}
      <Suspense fallback={null}>
        <LoginForm messages={messages} />
      </Suspense>
    </main>
  );
}
