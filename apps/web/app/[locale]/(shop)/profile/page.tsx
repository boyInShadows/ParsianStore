import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { AccountNav } from "@/components/account/AccountNav";
import { ProfileForm, type ProfileFormMessages } from "@/components/account/ProfileForm";
import { PageHeader } from "@/components/primitives/PageHeader";
import { Sheet } from "@/components/primitives/Sheet";
import { fetchMeServer } from "@/lib/fetchers/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Account.profile");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("Account.profile");
  const user = await fetchMeServer((await cookies()).toString());
  if (!user) return redirect({ href: "/auth/login?next=/profile", locale });

  const messages: ProfileFormMessages = {
    nameLabel: t("nameLabel"),
    emailLabel: t("emailLabel"),
    emailOptional: t("emailOptional"),
    phoneLabel: t("phoneLabel"),
    phoneHelper: t("phoneHelper"),
    save: t("save"),
    saving: t("saving"),
    success: t("success"),
    error: t("error"),
    nameError: t("nameError"),
    emailError: t("emailError"),
  };

  return (
    <main className="mx-auto flex max-w-container flex-col gap-6 px-4 py-8">
      <AccountNav active="profile" />
      <PageHeader code="ID" title={t("title")} />
      <p className="-mt-3 text-body text-text-muted">{t("subtitle")}</p>
      <Sheet className="p-5 sm:p-6">
        <ProfileForm user={user} messages={messages} />
      </Sheet>
    </main>
  );
}
