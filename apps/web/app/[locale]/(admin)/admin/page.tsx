import { redirect } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

// P8.S1: the P1.S6 demo page (fake DataGrid/chart proving the RTL/MUI
// wiring) is replaced now that a real admin page exists to prove that
// same wiring with real data instead -- CLAUDE.md rule 4, no placeholder
// content once the real thing exists. /admin/orders is the only real
// destination so far; this becomes a real nav hub once more Phase 8
// pieces land.
export default async function AdminIndexPage({ params }: Props) {
  const { locale } = await params;
  redirect({ href: "/admin/orders", locale });
}
