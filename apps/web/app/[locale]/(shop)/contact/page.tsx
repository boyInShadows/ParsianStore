import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/primitives/PageHeader";
import { CONTACT_CHANNELS } from "@/lib/contact-info";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Info.contact");
  return { title: t("title"), description: t("lead") };
}

/**
 * Every channel comes from `lib/contact-info.ts`, the same source the closing
 * beat and the footer read, so this page cannot drift into a different answer
 * and cannot invent one. WhatsApp is absent here for the reason it is absent
 * there: no number exists yet.
 */
export default async function ContactPage() {
  const t = await getTranslations("Info.contact");
  const labels: Record<string, string> = {
    phone: t("phoneLabel"),
    telegram: t("telegramLabel"),
    whatsapp: "WhatsApp",
  };

  return (
    <main className="mx-auto flex max-w-container flex-col gap-8 px-4 py-8 lg:px-8">
      <PageHeader code="CONTACT" title={t("title")} />
      <p className="max-w-prose text-body-lg text-text">{t("lead")}</p>

      <div className="grid gap-8 border-t border-rule pt-8 md:grid-cols-2">
        <section className="flex flex-col gap-4">
          <h2 className="text-body font-bold text-text">{t("channelsTitle")}</h2>
          <ul className="flex flex-col">
            {CONTACT_CHANNELS.map((channel) => (
              <li key={channel.kind} className="border-b border-rule first:border-t">
                <a
                  href={channel.href}
                  className="flex min-h-12 items-center justify-between gap-4 py-3 text-text transition-colors duration-fast hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg motion-reduce:transition-none"
                >
                  <span className="font-mono text-data text-text-muted">
                    {labels[channel.kind]}
                  </span>
                  {/* `dir="ltr"` on the value only, not on the row. A Latin
                      handle inside an RTL line gets its "@" pushed to the far
                      end -- "boyinshadows@" -- because bidi reorders the
                      neutral character. The footer already isolates its
                      channels the same way. The label beside it stays RTL, so
                      the accessible name still reads label-then-value. */}
                  <span dir="ltr" className="text-body-lg font-bold">
                    {channel.display}
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-1 pt-2">
            <h2 className="text-body font-bold text-text">{t("locationTitle")}</h2>
            <p className="text-body text-text-muted">{t("locationBody")}</p>
          </div>
        </section>

        {/* The half of a contact page that actually shortens the conversation:
            what to have ready before you call. A message form would be the
            template answer here and a worse one -- no ticketing system exists
            behind it yet, so it would promise a queue nobody is reading. */}
        {/* `bg-surface` with a rule, not `bg-surface-sunken`: the sunken token
            is the same value as the page background in both themes (it exists
            for a receipt block sitting on a raised surface), so on a plain page
            it renders as no container at all. */}
        <section className="flex flex-col gap-4 border border-rule bg-surface p-6">
          <h2 className="text-body font-bold text-text">{t("beforeTitle")}</h2>
          <ul className="flex flex-col gap-3">
            {(t.raw("beforeItems") as string[]).map((item, index) => (
              <li key={item} className="flex gap-3 text-body text-text-muted">
                <span className="font-mono text-data text-text-muted">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
