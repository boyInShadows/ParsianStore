import { getHealth } from "@/lib/api-client";

// Debug/proof-of-wiring page for P0.S3/P1.S3. Replaced by the real landing page in Phase 4.
export const dynamic = "force-dynamic";

export default async function Page() {
  const health = await getHealth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg p-4 text-text">
      <h1 className="font-display text-display-1 font-black text-brand">پارسیان</h1>
      <p className="font-body text-body text-text-muted">
        قطعه‌ای که به خودروی شما می‌خورد، نه چیزی شبیه آن.
      </p>
      <p className="font-mono text-data text-text-muted">API status: {health.data.status}</p>
      <p className="rounded-md border border-border px-3 py-1 font-mono text-data text-text">
        MB-0442-K
      </p>
    </main>
  );
}
