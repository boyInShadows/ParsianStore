import { normalizePhone, toPersianDigits } from "schemas";

/**
 * The store's real contact details, in one place so the closing beat and the
 * footer can never drift into two different answers.
 *
 * Owner-supplied 2026-08-20 (fableTasks §5 P9.S14). These replace the
 * deliberately-all-zero placeholder that stood here while no real number
 * existed -- the placeholder's whole point was that nobody could mistake it for
 * reachable, and now nobody has to.
 *
 * **Only channels that exist appear.** WhatsApp is named by masterPlan §5-13
 * and fableTasks §7 item 7, and the owner has not supplied a number, so it is
 * absent rather than dead-linked. The branch that would add it is written and
 * unreachable on purpose: supplying `WHATSAPP_NUMBER` is the entire change.
 */
const PHONE_NATIONAL = "09120570658";
const TELEGRAM_HANDLE = "boyinshadows";

/** Empty until the owner supplies one -- fableTasks §7 item 7. */
const WHATSAPP_NUMBER = "";

export type ContactChannelKind = "phone" | "telegram" | "whatsapp";

export type ContactChannel = {
  readonly kind: ContactChannelKind;
  readonly href: string;
  /**
   * What the visitor reads. Persian digits for the phone (§7.5 display rule --
   * a Persian page shows Persian numerals), the handle as typed for Telegram.
   */
  readonly display: string;
};

/**
 * `tel:` wants an unambiguous international number, so it gets the normalized
 * `+98…` form; the visitor gets Persian digits of the national form they would
 * actually dial. Two representations of one number, each correct for its job.
 */
export const CONTACT_PHONE_TEL = normalizePhone(PHONE_NATIONAL);
export const CONTACT_PHONE_DISPLAY = toPersianDigits(PHONE_NATIONAL);

function buildChannels(): ContactChannel[] {
  const channels: ContactChannel[] = [
    { kind: "phone", href: `tel:${CONTACT_PHONE_TEL}`, display: CONTACT_PHONE_DISPLAY },
    { kind: "telegram", href: `https://t.me/${TELEGRAM_HANDLE}`, display: `@${TELEGRAM_HANDLE}` },
  ];

  if (WHATSAPP_NUMBER.length > 0) {
    const normalized = normalizePhone(WHATSAPP_NUMBER);
    channels.push({
      // wa.me takes the international number without its leading `+`.
      kind: "whatsapp",
      href: `https://wa.me/${normalized.replace("+", "")}`,
      display: toPersianDigits(WHATSAPP_NUMBER),
    });
  }

  return channels;
}

export const CONTACT_CHANNELS: readonly ContactChannel[] = buildChannels();
