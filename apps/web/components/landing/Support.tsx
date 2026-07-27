import { getTranslations } from "next-intl/server";
import { SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL } from "@/lib/contact-info";
import { Reveal } from "@/components/motion";

// masterPlan.md §5 item 13. Real phone number and working hours aren't
// available yet (lib/contact-info.ts) -- an honest "to be announced"
// note, not a fabricated schedule. WhatsApp link is omitted entirely
// (not even a placeholder) since there's no number to build a wa.me link
// from at all.
export async function Support() {
  const t = await getTranslations("Landing.sections.support");

  return (
    <section
      id="support"
      aria-labelledby="support-heading"
      className="mx-auto max-w-container px-4 py-12"
    >
      <Reveal className="flex flex-col gap-2">
        <p className="font-mono text-data text-text-muted">{t("code")}</p>
        <h2 id="support-heading" className="font-display text-h2 font-black text-text">
          {t("title")}
        </h2>
        <p className="max-w-2xl text-body text-text-muted">{t("subtitle")}</p>
      </Reveal>
      <div className="mt-6 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="text-body-sm text-text-muted">{t("phone")}</span>
          <a href={`tel:${SUPPORT_PHONE_TEL}`} dir="ltr" className="text-body text-text">
            {SUPPORT_PHONE_DISPLAY}
          </a>
        </div>
        <p className="text-body-sm text-text-muted">{t("hoursPending")}</p>
      </div>
    </section>
  );
}
