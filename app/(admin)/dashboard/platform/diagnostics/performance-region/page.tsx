/**
 * PERFORMANCE-01A-R3 — temporary Vercel region + DB RTT proof (STAGE/Preview only).
 *
 * Read-only diagnostic rendered from the authenticated admin shell where session
 * resolution is already proven. Remove after region mismatch is validated.
 */

import { notFound } from "next/navigation";
import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import { SectionCard } from "@/components/ui/page";
import { prisma } from "@/lib/db/prisma";
import {
  collectPerf01aRegionProof,
  isPerf01aRegionProofEnvironment,
} from "@/lib/diagnostics/sce-perf-01a-region-proof";
import { getRuntimeEnvironment } from "@/lib/env";
import { requirePlatformWorkspaceOperator } from "@/lib/permissions/require-platform-operator-permission";

export const dynamic = "force-dynamic";

export default async function PerformanceRegionDiagnosticPage() {
  const runtimeEnv = getRuntimeEnvironment();
  if (!isPerf01aRegionProofEnvironment(runtimeEnv)) {
    notFound();
  }

  await requirePlatformWorkspaceOperator();

  let payload;
  try {
    payload = await collectPerf01aRegionProof(prisma);
  } catch {
    notFound();
  }

  const vercelLabel = payload.vercelRegion ?? "—";
  const databaseLabel = payload.databaseRegion ?? "—";

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <AdminSectionHeader
        eyebrow="Diagnostics"
        title="Performance Region Diagnostic"
        description="Temporary read-only region and database round-trip sample (Preview/STAGE only)."
      />

      <SectionCard title="Runtime regions" description="Safe operational labels only — no credentials or hostnames.">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-[var(--border)] pb-3">
            <dt className="font-medium text-[var(--text-2)]">Vercel runtime</dt>
            <dd className="font-mono text-[var(--foreground)]">{vercelLabel}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="font-medium text-[var(--text-2)]">Database region</dt>
            <dd className="font-mono text-[var(--foreground)]">{databaseLabel}</dd>
          </div>
        </dl>
      </SectionCard>

      <SectionCard title="SELECT 1" description="Five sequential warm samples via the shared Prisma client.">
        <div className="space-y-4 text-sm">
          <ul className="font-mono text-[var(--foreground)]">
            {payload.select1.samplesMs.map((ms, index) => (
              <li key={index}>{ms} ms</li>
            ))}
          </ul>
          <dl className="space-y-2 border-t border-[var(--border)] pt-3">
            <div className="flex justify-between">
              <dt className="font-medium text-[var(--text-2)]">p50</dt>
              <dd className="font-mono">{payload.select1.p50Ms} ms</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-[var(--text-2)]">p95</dt>
              <dd className="font-mono">{payload.select1.p95Ms} ms</dd>
            </div>
          </dl>
        </div>
      </SectionCard>
    </div>
  );
}
