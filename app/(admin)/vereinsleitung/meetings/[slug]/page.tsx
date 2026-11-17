import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import { getMeetingBySlug, getMeetingSubEntities } from "@/lib/meetings/queries";
import { getMeetingApprovalWorkspaceData } from "@/lib/meetings/meeting-approval-workspace-data";
import { resolvePersonIdForUser } from "@/lib/meetings/meeting-person-payload";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import VereinsleitungMeetingDetail from "@/components/admin/vereinsleitung/VereinsleitungMeetingDetail";
import ContextRelatedTasksPanel from "@/components/admin/aufgaben/contextual/ContextRelatedTasksPanel";
import { MeetingWorkspaceDirtyShell } from "@/components/admin/meetings/workspace/MeetingWorkspaceDirtyShell";
import { getTaskServiceContext } from "@/lib/tasks/server-context";
import { loadContextualTaskCreateView } from "@/lib/tasks/load-contextual-task-create-view";
import { TaskContextType } from "@prisma/client";
import { loadMeetingPendenzenSnapshot } from "@/lib/meetings/load-meeting-pendenzen";
import { PageShell } from "@/components/ui/page";
import { DetailPagePattern } from "@/components/ui/patterns";
import { getActiveTenant, requireActiveTenantId } from "@/lib/tenants/active-tenant";
import type { TenantFormatConfig } from "@/lib/tenant-runtime/formatters";

type MeetingDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function MeetingDetailPage({ params }: MeetingDetailPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { slug } = await params;
  const tenantId = await requireActiveTenantId();
  const actor = await getActorContext(session.user, tenantId);

  // 404-masking: null if actor cannot see this meeting
  const dbMeeting = await getMeetingBySlug(slug, actor);
  if (!dbMeeting) notFound();

  const subEntities = await getMeetingSubEntities(dbMeeting.id, actor.tenantId);

  const actorPersonId =
    actor.tenantId && session.user?.id
      ? await resolvePersonIdForUser(actor.tenantId, session.user.id)
      : null;

  const approvalWorkspaceData = await getMeetingApprovalWorkspaceData({
    tenantId,
    meetingId: dbMeeting.id,
    protocolApproverPersonIds: dbMeeting.protocolApproverPersonIds,
    decisionApproverIdsByDecisionId: Object.fromEntries(
      subEntities.decisions.map((d) => [d.id, d.approverPersonIds]),
    ),
  });

  // Resolve permanent-delete authority for delete button visibility
  let canDelete = false;
  if (tenantId) {
    const resolver = createEffectivePermissionResolver(prisma);
    canDelete = await resolver.hasTenantDeletionAuthority({
      userId: session.user.id,
      permission: PERMISSIONS.MEETINGS_DELETE,
      tenantId,
    });
  }

  const pageTitle = dbMeeting.title;
  const canManage = actor.permissionKeys.includes(PERMISSIONS.MEETINGS_MANAGE);
  const tenant = await getActiveTenant();
  const fmtCfg: TenantFormatConfig = {
    locale: tenant?.locale ?? "de-CH",
    timezone: tenant?.timezone ?? "Europe/Zurich",
  };
  const taskPanelLocale = fmtCfg.locale ?? "de-CH";
  const taskPanelTimeZone = fmtCfg.timezone ?? "Europe/Zurich";

  const taskCtx = await getTaskServiceContext();
  const meetingTaskCreateView = taskCtx
    ? await loadContextualTaskCreateView(
        taskCtx,
        TaskContextType.MEETING,
        dbMeeting.id,
        taskPanelLocale,
        taskPanelTimeZone,
      )
    : null;
  const meetingTaskCreate =
    meetingTaskCreateView?.canCreate
      ? {
          presentation: meetingTaskCreateView.presentation,
          orgUnitOptions: meetingTaskCreateView.orgUnitOptions,
          timeZone: meetingTaskCreateView.timeZone,
          tenantWideVisibility: meetingTaskCreateView.tenantWideVisibility,
        }
      : null;

  const pendenzenSnapshot = await loadMeetingPendenzenSnapshot({
    meeting: {
      id: dbMeeting.id,
      title: dbMeeting.title,
      slug: dbMeeting.slug,
      meetingDate: dbMeeting.meetingDate,
    },
    taskCtx,
  });
  const initialPendenzenOpenCount = pendenzenSnapshot.openCount;
  const initialPendenzenOverdueCount = pendenzenSnapshot.overdueCount;

  const detailPage = (
    <DetailPagePattern
      className="[&_h1]:sr-only"
      eyebrow="Vereinsleitung"
      title={pageTitle}
      breadcrumbs={[
        { label: "Vereinsleitung", href: "/vereinsleitung" },
        { label: "Sitzungen", href: "/vereinsleitung/meetings" },
        { label: pageTitle },
      ]}
      headerActions={
        <div className="flex items-center gap-2">
          <Link
            href="/vereinsleitung/meetings"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-transparent px-3.5 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
            data-testid="meeting-workspace-back-to-list"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Zurück zu Sitzungen
          </Link>
        </div>
      }
    >
      <VereinsleitungMeetingDetail
        dbMeeting={dbMeeting}
        subEntities={subEntities}
        meetingSlug={slug}
        meetingTitle={pageTitle}
        fmtCfg={fmtCfg}
        canManage={canManage}
        actorPersonId={actorPersonId}
        approvalWorkspaceData={approvalWorkspaceData}
        canDelete={canDelete}
        initialPendenzenOpenCount={initialPendenzenOpenCount}
        initialPendenzenOverdueCount={initialPendenzenOverdueCount}
        timerScope={
          canManage && session.user?.id
            ? {
                meetingId: dbMeeting.id,
                tenantId,
                userId: session.user.id,
              }
            : null
        }
        relatedTasksPanel={
          <ContextRelatedTasksPanel
            contextType="MEETING"
            contextId={dbMeeting.id}
            locale={taskPanelLocale}
            timeZone={taskPanelTimeZone}
            pendenzenEmbed
          />
        }
        meetingTaskCreate={meetingTaskCreate}
      />
    </DetailPagePattern>
  );

  return (
    <PageShell fullWidth>
      <MeetingWorkspaceDirtyShell>{detailPage}</MeetingWorkspaceDirtyShell>
    </PageShell>
  );
}
