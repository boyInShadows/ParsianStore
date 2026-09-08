# Voice — «استادکار»

Every line on this site is written by the man behind the counter -- the one who
knows cars. Not a brand, not a brochure, not a marketing team. One mechanic,
talking to one driver.

This page is the whole rule set. If a string can't be checked against it in
ten seconds, the rule is wrong, not the string.

## The seven rules

1. **Second person.** «مدل و سال را بزنید» — not «مشتریان می‌توانند مدل خود را
   انتخاب کنند». Address the person, always.
2. **Short sentences. One idea per line.** A full stop is cheaper than a comma.
   If a line carries two ideas, it is two lines.
3. **Verbs first.** «می‌گوییم از کجا آمده» beats «شفافیت در تأمین». A noun
   phrase describes a value; a verb describes something we do.
4. **No adjective that can't be checked.** «بهترین», «بی‌نظیر», «برترین»,
   «بی‌رقیب», «عالی», «معتبر», «فوق‌العاده» are banned outright. Replace the
   adjective with the mechanism: not «برندهای معتبر» but «برندهایی که خودمان هم
   می‌خریم».
5. **Name the car when you know it.** «پراید تا شاهین، سمند تا تارا» — real
   models from the real vehicle tree. Never a model we don't stock.
6. **Admit limits.** «اگر نداشتیم، می‌گوییم.» A limit stated up front is the
   cheapest trust we can buy. It also means we never claim a signal we don't
   have: the featured rail is «تازه آمده», not «پرفروش», because there is no
   sales history yet.
7. **Claim only what the page can prove.** Every promise in the copy must point
   at something a visitor can go and check on this site — a code, a field, a
   phone number, a filter. This is also why the copy says
   «هر روز همین کار را می‌کنیم» and not «بیست سال است همین کار را می‌کنیم»:
   nobody has confirmed twenty years, so the site does not say twenty years.

## How it reads

| Not this | This |
|---|---|
| مخصوص سایپا و ایران‌خودرو. قطعه اصلی، اصالت‌سنجی‌شده و با ارسال سریع. | اصل، با کد فنی. برای سایپا و ایران‌خودرو. |
| ضمانت اصالت، نه یک شعار | اصالت را نشان می‌دهیم، نه ادعا. |
| برندهای معتبر | برندهایی که خودمان هم می‌خریم. |
| خرید بر اساس خودرو | از خودروی خودتان شروع کنید. |
| تطبیق با خودروی شما | می‌گوییم به کدام مدل می‌خورد |

## Mechanics

- **Persian digits** for anything read as a number — counts, prices, years,
  ordinals. Latin digits **only** inside identifiers: part codes, SKUs,
  `SYS-05`, section plate numbers, phone placeholders. Enforced by
  `apps/web/messages/digits.test.ts`; the identifier exceptions are an explicit
  allowlist, not a pattern.
- **ZWNJ** («‌», U+200C) inside compounds: «می‌گوییم», «قطعه‌های»,
  «ایران‌خودرو», «همین‌جا». Never a plain space, never nothing.
- **Guillemets** «…» for quoted copy, as the rest of the codebase does.
- **Logical punctuation only.** No physical direction anywhere near the string
  or the markup around it.
- All copy lives in `apps/web/messages/fa.json`. English is suspended
  (ADR 0016); `en.json` is frozen and is not updated.

## Width

Every string must fit a **390px** phone.

- A section **H2** must not wrap to three lines — keep it under ~35 characters.
- A **lead** paragraph under an H2: ~90 characters.
- A **card title** or trust-strip claim: ~35 characters, one line.
- A **caption** under a control: ~60 characters.

When in doubt, cut a clause. There has never been a lead that got worse for
losing its second sentence.
