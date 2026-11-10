import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { getOrgUnitById, getOrgUnitMembershipHistory } from "@/lib/org/queries";
import { getActiveTenant } from "@/lib/tenants/active-tenant";
import { prisma } from "@/lib/db/prisma";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import { canAccessOrgUnit, canManageOrgUnit } from "@/lib/visibility/org-unit-access";
import OrgMembershipHistoryView from "@/components/admin/org/OrgMembershipHistoryView";
import OrgUnitRecordTabs from "@/components/admin/org/OrgUnitRecordTabs";
import { PageShell } from "@/components/ui/page";
import { DetailPagePattern } from "@/components/ui/patterns";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ seasonId?: string; status?: string }>;
};

export default async function OrgUnitMembershipHistoryPage({ params, searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const { seasonId, status } = await searchParams;

  // Phase 2: org-unit-aware access — same rule as the detail page.
  const actor = await getActorContext(session.user, session.user?.activeTenantId ?? undefined);
  if (!canAccessOrgUnit(id, actor)) {
    redirect("/dashboard");
  }

  const [unit, tenant] = await Promise.all([
    getOrgUnitById(id),
    getActiveTenant(),
  ]);
  if (!unit) notFound();
  if (unit.tenantId !== null && tenant && unit.tenantId !== tenant.id) notFound();

  const [history, seasons] = await Promise.all([
    getOrgUnitMembershipHistory(id, { seasonId, status }),
    prisma.season.findMany({
      orderBy: { startDate: "desc" },
      select: { id: true, name: true, key: true, isActive: true },
    }),
  ]);

  // Ancestor chain for breadcrumb — built using scalar parentId so the logic
  // works regardless of whether the Prisma client includes the parent relation.
  const ancestors: Array<{ id: string; name: string }> = [];
  if (unit.parentId) {
    const parent = await prisma.orgUnit.findUnique({
      where: { id: unit.parentId },
      select: { id: true, name: true, parentId: true },
    });
    if (parent) {
      if (unit.level === 2 && parent.parentId) {
        const grandparent = await prisma.orgUnit.findUnique({
          where: { id: parent.parentId },
          select: { id: true, name: true },
        });
        if (grandparent) ancestors.push(grandparent);
      }
      ancestors.push({ id: parent.id, name: parent.name });
    }
  }

  const canManage = canManageOrgUnit(actor);

  return (
    <PageShell fullWidth>
      <DetailPagePattern
        eyebrow="Organisation"
        title="Mitgliedschafts-Verlauf"
        description={unit.name}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Organisation", href: "/dashboard/org-units" },
          ...ancestors.map((ancestor) => ({
            label: ancestor.name,
            href: `/dashboard/org-units/${ancestor.id}`,
          })),
          { label: unit.name, href: `/dashboard/org-units/${id}` },
          { label: "Verlauf" },
        ]}
        contextTabs={<OrgUnitRecordTabs orgUnitId={id} showEdit={canManage} />}
        headerActions={
          <Link
            href={`/dashboard/org-units/${id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm font-medium text-[var(--text-2)] transition hover:bg-[var(--surface-2)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Zurück zur Einheit
          </Link>
        }
      >
      <OrgMembershipHistoryView
        orgUnitId={id}
        history={history}
        seasons={seasons}
        currentSeasonId={seasonId}
        currentStatus={status}
      />
      </DetailPagePattern>
    </PageShell>
  );
}
