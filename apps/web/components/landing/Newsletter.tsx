import { getTranslations } from "next-intl/server";
import { Input, Button } from "@/components/primitives";
import { Reveal } from "@/components/motion";

// masterPlan.md §5 item 14: "Phone-first, not email-first. One field."
// No newsletter/SMS collection endpoint exists yet -- the field and
// button are real but disabled, with an honest "coming soon" note next
// to them, rather than faking a submit that goes nowhere or silently
// pretending to succeed.
/**
 * Hidden on purpose, not broken. fableTasks §7 item 6 carries the return
 * condition: the subscription backend does not exist, and a phone field that
 * collects nothing is worse than no field at all.
 *
 * An explicit named flag rather than deleting the component or commenting out
 * the call site: the section is finished work waiting on something outside the
 * code, and a flag says that where a missing file would just look like an
 * oversight. Flip this to `false` when the condition is met -- nothing else
 * about the section needs to change.
 */
const SECTION_HIDDEN = true;

export async function Newsletter() {
  if (SECTION_HIDDEN) return null;

  const t = await getTranslations("Landing.sections.newsletter");

  return (
    <section
      id="newsletter"
      aria-labelledby="newsletter-heading"
      className="mx-auto max-w-container px-4 py-12"
    >
      <Reveal className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-data text-text-muted">{t("code")}</p>
          <h2 id="newsletter-heading" className="font-display text-h2 font-black text-text">
            {t("title")}
          </h2>
          <p className="text-body text-text-muted">{t("subtitle")}</p>
        </div>
        <form className="flex w-full flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <Input
              type="tel"
              dir="ltr"
              label={t("phoneLabel")}
              placeholder={t("phonePlaceholder")}
              disabled
            />
          </div>
          <Button type="submit" disabled className="sm:self-end">
            {t("submit")}
          </Button>
        </form>
        <p className="text-body-sm text-text-muted">{t("comingSoon")}</p>
      </Reveal>
    </section>
  );
}
