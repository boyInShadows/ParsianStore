"use client"; // A React context provider -- context itself only exists on
// the client side of the boundary.

import { createContext, useContext, type ReactNode } from "react";

/**
 * P8.S8. The (admin) layout already resolves the signed-in staff user
 * server-side; this carries just their role down so per-page chrome
 * (AdminShell's nav) can hide entries the role cannot open. A plain
 * string crosses the Server->Client boundary fine, unlike the whole user
 * object's Date fields.
 *
 * This is presentation only. Every role restriction is enforced by the
 * API (requireRole in audit.admin.routes.ts) -- hiding a link is never
 * the access control.
 */
const AdminRoleContext = createContext<string | null>(null);

export function AdminRoleProvider({ role, children }: { role: string; children: ReactNode }) {
  return <AdminRoleContext.Provider value={role}>{children}</AdminRoleContext.Provider>;
}

export function useAdminRole(): string | null {
  return useContext(AdminRoleContext);
}
