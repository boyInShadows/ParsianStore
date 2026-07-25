import { getHealth } from "@/lib/api-client";

// Debug/proof-of-wiring page for P0.S3. Replaced by the real landing page in Phase 4.
export const dynamic = "force-dynamic";

export default async function Page() {
  const health = await getHealth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 bg-bg p-4 text-text">
      <h1 className="text-2xl font-semibold text-brand">ParsianStore</h1>
      <p className="text-text-muted">API status: {health.data.status}</p>
    </main>
  );
}
