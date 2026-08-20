import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { getMessages } from "./messages";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  // Non-default locales are layered over `fa` -- see messages.ts for why.
  return { locale, messages: getMessages(locale) };
});
