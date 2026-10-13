import Link from "next/link";
import { requirePermission } from "@/lib/permissions/require-permission";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { prisma } from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import ClubEventApprovalDecisionForm from "@/components/admin/veranstaltungen/ClubEventApprovalDecisionForm";

export default async function VeranstaltungenFreigabenPage() {
  await requirePermission(PERMISSIONS.ACTIVITIES_CLUB_EVENT_APPROVE);
  const tenant = await getActiveTenant();
  if (!tenant) notFound();

  const pending = await prisma.sceActivityGovernanceRevision.findMany({
    where: {
      tenantId: tenant.id,
      activityType: "CLUB_EVENT",
      lifecycleState: "PENDING_APPROVAL",
      isCurrentSubmission: true,
    },
    orderBy: { submittedAt: "desc" },
    take: 50,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Veranstaltungen — Freigaben</h1>
        <Link href="/dashboard/veranstaltungen" className="fca-button-secondary text-sm">
          Zurück
        </Link>
      </div>
      {pending.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">Keine ausstehenden Einreichungen.</p>
      ) : (
        <ul className="space-y-3">
          {pending.map((revision) => {
            const payload = revision.payloadSnapshot as { title?: string };
            return (
              <li
                key={revision.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4"
              >
                <p className="font-medium">{payload.title?.trim() || "Veranstaltung"}</p>
                <p className="text-xs text-[var(--muted)]">
                  Revision {revision.revisionNumber} · eingereicht{" "}
                  {revision.submittedAt?.toLocaleString("de-CH") ?? "—"}
                </p>
                <ClubEventApprovalDecisionForm revisionId={revision.id} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
