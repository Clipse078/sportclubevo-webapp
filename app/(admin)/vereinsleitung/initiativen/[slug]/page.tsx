import Link from "next/link";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";
import { ArrowLeft, Calendar, Flag } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getInitiativeBySlug } from "@/lib/initiatives/queries";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import { prisma } from "@/lib/db/prisma";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import InitiativeGovernanceBanner from "@/components/admin/initiatives/InitiativeGovernanceBanner";
import InitiativeDeleteButton from "@/components/admin/initiatives/InitiativeDeleteButton";
import ReviewStageBadge from "@/components/admin/shared/ReviewStageBadge";
import { PageShell, SectionCard, EmptyState } from "@/components/ui/page";
import { DetailPagePattern } from "@/components/ui/patterns";
import { Badge } from "@/components/ui";
import { PropertyGrid } from "@/components/ui/PropertyGrid";
import { MetadataCard } from "@/components/ui/MetadataCard";
import { TimelinePlaceholder } from "@/components/ui/TimelinePlaceholder";
import { loadInitiativeConnectedWork } from "@/lib/club-development/initiative-connected-work";
import InitiativeConnectedWorkSection from "@/components/admin/club-development/InitiativeConnectedWorkSection";
import InitiativeMilestonesSection from "@/components/admin/club-development/InitiativeMilestonesSection";
import InitiativeTargetLinksSection from "@/components/admin/club-development/InitiativeTargetLinksSection";
import InitiativePrimaryTasksSection from "@/components/admin/club-development/InitiativePrimaryTasksSection";
import ContextRelatedTasksPanel from "@/components/admin/aufgaben/contextual/ContextRelatedTasksPanel";
import { computeInitiativeProgressSnapshot } from "@/lib/club-development/initiative-progress";
import InitiativeApprovalPanel from "@/components/admin/initiatives/InitiativeApprovalPanel";
import { resolvePersonIdForUser } from "@/lib/meetings/meeting-person-payload";
import { getInitiativeApprovalVotes } from "@/lib/club-development/initiative-approval-queries";
import { groupApprovalVotesByRevision } from "@/lib/club-development/club-development-approval-vote-revision";
import { parseApproverPersonIds } from "@/lib/club-development/initiative-approval-presentation";
import { personLabelFromRecord } from "@/lib/meetings/meeting-person-display";
import type { MeetingApprovalVoteView } from "@/lib/meetings/meeting-approval-workspace-data";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const STATUS_LABELS: Record<string, string> = {
  PLANNED: "Geplant",
  IN_PROGRESS: "In Arbeit",
  ON_TRACK: "On Track",
  ON_HOLD: "Pausiert",
  COMPLETED: "Abgeschlossen",
  CANCELLED: "Abgesagt",
};

const DISPOSITION_LABELS: Record<string, string> = {
  NONE: "Keine",
  DEFERRED: "Zurückgestellt",
  REJECTED: "Abgelehnt",
  ARCHIVED: "Archiviert",
};

const STATUS_BADGE_VARIANTS: Record<
  string,
  "default" | "primary" | "success" | "warning" | "danger" | "info" | "secondary" | "outline"
> = {
  PLANNED: "default",
  IN_PROGRESS: "primary",
  ON_TRACK: "success",
  ON_HOLD: "warning",
  COMPLETED: "success",
  CANCELLED: "danger",
};

function formatSwissDate(date: Date | string) {
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export default async function InitiativeDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { slug } = await params;
  const actor = await getActorContext(session.user, session.user?.activeTenantId ?? undefined);

  // 404-masking: getInitiativeBySlug returns null if actor cannot see the record.
  // The "not in DB" fallback card renders identically — no 403 leakage.
  const dbInitiative = await getInitiativeBySlug(slug, actor);

  // Resolve permanent-delete authority for delete button visibility
  const tenantId = session.user?.activeTenantId;
  let canDelete = false;
  if (dbInitiative && tenantId) {
    const resolver = createEffectivePermissionResolver(prisma);
    canDelete = await resolver.hasTenantDeletionAuthority({
      userId: session.user.id,
      permission: PERMISSIONS.INITIATIVES_DELETE,
      tenantId,
    });
  }

  const connectedWork =
    dbInitiative && actor.tenantId
      ? await loadInitiativeConnectedWork(actor, dbInitiative.id)
      : null;

  const progressSnapshot =
    dbInitiative && actor.tenantId
      ? await computeInitiativeProgressSnapshot(actor.tenantId, dbInitiative.id)
      : null;

  const actorPersonId =
    dbInitiative && actor.tenantId
      ? await resolvePersonIdForUser(actor.tenantId, actor.userId)
      : null;
  const canManageInitiative = actor.permissionKeys.includes(PERMISSIONS.INITIATIVES_MANAGE);

  let initiativeVoteViews: MeetingApprovalVoteView[] = [];
  let initiativeVoteHistory: ReturnType<typeof groupApprovalVotesByRevision>["history"] = [];
  const initiativeApproverLabels: Record<string, string> = {};

  if (dbInitiative && actor.tenantId) {
    const votes = await getInitiativeApprovalVotes(dbInitiative.id, actor.tenantId);
    const { currentVotes, history } = groupApprovalVotesByRevision(
      votes.map((v) => ({
        approverPersonId: v.approverPersonId,
        decision: v.decision,
        contentRevision: v.contentRevision,
        comment: v.comment,
        decidedAt: v.decidedAt,
        legacyRevisionUnscoped: v.legacyRevisionUnscoped,
      })),
      dbInitiative.approvalContentRevision,
    );
    initiativeVoteHistory = history;
    const approverIds = [
      ...parseApproverPersonIds(dbInitiative.approverPersonIds),
      ...votes.map((v) => v.approverPersonId),
    ];
    const uniqueIds = [...new Set(approverIds)];
    if (uniqueIds.length > 0) {
      const people = await prisma.person.findMany({
        where: { tenantId: actor.tenantId, id: { in: uniqueIds } },
        select: { id: true, displayName: true, firstName: true, lastName: true },
      });
      for (const p of people) {
        initiativeApproverLabels[p.id] = personLabelFromRecord(p);
      }
    }
    initiativeVoteViews = currentVotes.map((v) => ({
      approverPersonId: v.approverPersonId,
      approverLabel: initiativeApproverLabels[v.approverPersonId] ?? "Unbekannte Person",
      decision: v.decision,
      comment: v.comment ?? null,
      decidedAt: v.decidedAt ?? null,
    }));
  }

  const pageTitle = dbInitiative?.title ?? slug;
  const statusLabel = dbInitiative?.status
    ? (STATUS_LABELS[dbInitiative.status] ?? dbInitiative.status)
    : undefined;

  return (
    <PageShell fullWidth>
      <DetailPagePattern
        eyebrow="Initiativen"
        title={pageTitle}
        description={dbInitiative?.summary ?? undefined}
        headerBadge={
          dbInitiative?.status ? (
            <Badge
              variant={STATUS_BADGE_VARIANTS[dbInitiative.status] ?? "default"}
            >
              {statusLabel}
            </Badge>
          ) : undefined
        }
        breadcrumbs={[
          { label: "Vereinsleitung", href: "/vereinsleitung" },
          { label: "Initiativen", href: "/vereinsleitung/initiativen" },
          { label: pageTitle },
        ]}
        headerActions={
          <div className="flex items-center gap-2">
            {canDelete && dbInitiative ? (
              <InitiativeDeleteButton
                initiativeId={dbInitiative.id}
                initiativeTitle={dbInitiative.title}
              />
            ) : null}
            <Link
              href="/vereinsleitung/initiativen"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-transparent px-3.5 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Zurück
            </Link>
          </div>
        }
        summary={
          dbInitiative ? (
            <InitiativeGovernanceBanner initiative={dbInitiative} />
          ) : undefined
        }
        sidebar={
          dbInitiative ? (
            <>
              {/* Details sidebar */}
              <SectionCard title="Details">
                <PropertyGrid
                  items={[
                    {
                      label: "Verantwortlich",
                      value: dbInitiative.owner,
                      icon: <ProductDomainSceIcon name="people" size={12} />,
                      emptyText: "Nicht erfasst",
                    },
                    {
                      label: "Fällig bis",
                      value: dbInitiative.dueDate
                        ? formatSwissDate(dbInitiative.dueDate)
                        : null,
                      icon: <Calendar className="h-3.5 w-3.5" />,
                      emptyText: "Kein Datum",
                    },
                    {
                      label: "Status",
                      value: statusLabel,
                      icon: <Flag className="h-3.5 w-3.5" />,
                    },
                    {
                      label: "Backlog-Priorität",
                      value: String(dbInitiative.backlogPriority ?? 0),
                    },
                    {
                      label: "Disposition",
                      value:
                        DISPOSITION_LABELS[dbInitiative.disposition ?? "NONE"] ??
                        dbInitiative.disposition,
                    },
                  ]}
                  columns={1}
                />
              </SectionCard>

              {/* Review info */}
              <SectionCard title="Freigabe">
                <div className="flex flex-wrap items-center gap-2">
                  <ReviewStageBadge stage={dbInitiative.reviewStage} />
                  {dbInitiative.requiresFourEyeReview ? (
                    <Badge variant="secondary" size="sm">
                      <ProductDomainSceIcon name="roles-access" size={12} />
                      4-Augen
                    </Badge>
                  ) : null}
                </div>
              </SectionCard>

              {/* System metadata */}
              <MetadataCard
                fields={[
                  { label: "Erstellt", value: formatSwissDate(dbInitiative.createdAt) },
                ]}
              />

              <TimelinePlaceholder />
            </>
          ) : undefined
        }
      >
        {dbInitiative ? (
          <>
            {/* Description & progress */}
            <SectionCard title="Beschreibung">
              {dbInitiative.expectedOutcome ? (
                <div className="mb-4 rounded-lg border border-[var(--border)]/80 bg-[var(--surface-2)]/40 px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    Erwartetes Outcome
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-2)] whitespace-pre-wrap">
                    {dbInitiative.expectedOutcome}
                  </p>
                </div>
              ) : null}
              {dbInitiative.description ? (
                <p className="text-sm leading-relaxed text-[var(--text-2)]">
                  {dbInitiative.description}
                </p>
              ) : (
                <p className="text-sm italic text-[var(--muted)]">
                  Noch keine ausführliche Beschreibung erfasst.
                </p>
              )}

              <div className="mt-5" data-testid="initiative-auto-progress">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                    Fortschritt (automatisch)
                  </p>
                  <span className="text-sm font-semibold text-[var(--sce-primary)]">
                    {progressSnapshot?.progress ?? 0}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[var(--surface-2)]">
                  <div
                    className="h-2 rounded-full bg-[var(--sce-primary)]"
                    style={{
                      width: `${Math.min(100, progressSnapshot?.progress ?? 0)}%`,
                    }}
                  />
                </div>
                {progressSnapshot && progressSnapshot.eligibleCount === 0 ? (
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    Noch keine verknüpften Aufgaben — Fortschritt wird aus erledigten Aufgaben berechnet.
                  </p>
                ) : progressSnapshot ? (
                  <p className="mt-2 text-xs text-[var(--text-2)]">
                    {progressSnapshot.completedCount} von {progressSnapshot.eligibleCount} Aufgaben erledigt
                  </p>
                ) : null}
              </div>
            </SectionCard>

            <SectionCard title="Optionale Freigabe">
              <InitiativeApprovalPanel
                initiativeId={dbInitiative.id}
                canManage={canManageInitiative}
                actorPersonId={actorPersonId}
                contentRevision={dbInitiative.approvalContentRevision}
                votes={initiativeVoteViews}
                voteHistory={initiativeVoteHistory}
                approverLabels={initiativeApproverLabels}
                initiative={{
                  approvalRequired: dbInitiative.approvalRequired,
                  approvalRule: dbInitiative.approvalRule,
                  approverPersonIds: dbInitiative.approverPersonIds,
                  approvalStatus: dbInitiative.approvalStatus,
                }}
              />
            </SectionCard>

            <SectionCard title="Strategische Ziele">
              <InitiativeTargetLinksSection initiativeId={dbInitiative.id} canManage={canManageInitiative} />
            </SectionCard>

            <SectionCard title="Meilensteine">
              <InitiativeMilestonesSection initiativeId={dbInitiative.id} canManage={canManageInitiative} />
            </SectionCard>

            <SectionCard title="Optionale Aufgabenverknüpfung">
              <InitiativePrimaryTasksSection initiativeId={dbInitiative.id} canManage={canManageInitiative} />
            </SectionCard>

            {connectedWork ? <InitiativeConnectedWorkSection connected={connectedWork} /> : null}

            {dbInitiative ? (
              <SectionCard title="Aufgaben zum Vorhaben">
                <ContextRelatedTasksPanel
                  contextType="INITIATIVE"
                  contextId={dbInitiative.id}
                />
              </SectionCard>
            ) : null}
          </>
        ) : (
          // Graceful fallback for slugs not yet in DB (legacy mock links still work)
          <SectionCard title="Initiative nicht gefunden">
            <EmptyState
              heading="Diese Initiative ist noch nicht erfasst"
              description={`Slug: ${slug}`}
            />
          </SectionCard>
        )}
      </DetailPagePattern>
    </PageShell>
  );
}
