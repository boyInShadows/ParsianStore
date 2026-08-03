import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "@/i18n/navigation";
import { MuiProviders } from "@/components/admin/mui-providers";
import { AdminToaster } from "@/components/admin/AdminToaster";
import { AdminRoleProvider } from "@/components/admin/AdminRoleProvider";
import { fetchMeServer } from "@/lib/fetchers/auth";

/**
 * MUI is imported ONLY here, under (admin) -- masterPlan.md §7.4's physical
 * separation rule. tailwind.config.js's content glob excludes app/(admin)/**
 * so Tailwind never generates utility classes for anything in this subtree.
 *
 * P8.S1: the auth+role gate for the entire admin route group lives here,
 * not per-page -- unlike the shop side, every single page under (admin)
 * needs the exact same "signed in AND staff" check, so this is a real
 * layout-level concern, not premature abstraction. Server-side, same
 * cookie-forwarding reasoning /orders' own gate (P7.S1) established: no
 * reason to ship client JS just for an auth check. Not authenticated at
 * all -> the same /auth/login OTP flow customers use (no separate admin
 * login exists, staff accounts are just User.role != "customer").
 * Authenticated but role is "customer" -> sent home rather than back to
 * login (they ARE signed in, just not staff -- looping them to the login
 * screen again would be confusing, not a re-auth prompt).
 */
export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const cookieHeader = (await cookies()).toString();
  const user = await fetchMeServer(cookieHeader);

  if (!user) {
    redirect({ href: "/auth/login?next=/admin", locale });
  } else if (user.role === "customer") {
    redirect({ href: "/", locale });
  }

  return (
    <MuiProviders>
      {/* P8.S8: the role the gate above already resolved, carried down so
          AdminShell can hide nav entries this role cannot open. The API
          enforces the same restriction independently -- see
          audit.admin.routes.ts. `redirect()` above never returns, so
          `user` is non-null here despite TypeScript not knowing it. */}
      <AdminRoleProvider role={user?.role ?? ""}>
        {children}
        <AdminToaster />
      </AdminRoleProvider>
    </MuiProviders>
  );
}
