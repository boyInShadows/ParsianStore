import { getHealth } from "@/lib/api-client";

// Debug/proof-of-wiring page for P0.S3. Replaced by the real landing page in Phase 4.
export const dynamic = "force-dynamic";

export default async function Page() {
  const health = await getHealth();

  return (
    <main>
      <h1>ParsianStore</h1>
      <p>API status: {health.data.status}</p>
    </main>
  );
}
