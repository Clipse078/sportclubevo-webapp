import Link from "next/link";
import { ArrowLeft, Edit, Workflow } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getActorContext } from "@/lib/visibility/get-actor-context";
import {
  getClubDevelopmentProcessBySlug,
  getProcessApprovalVotes,
} from "@/lib/club-development/process-queries";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { resolvePersonIdForUser } from "@/lib/meetings/meeting-person-payload";
import { personLabelFromRecord } from "@/lib/meetings/meeting-person-display";
import { prisma } from "@/lib/db/prisma";
import type { MeetingApprovalVoteView } from "@/lib/meetings/meeting-approval-workspace-data";
import ProcessApprovalPanel from "@/components/admin/club-development/ProcessApprovalPanel";
import VisibilityScopeBadge from "@/components/admin/shared/VisibilityScopeBadge";
import { PageShell, SectionCard, EmptyState } from "@/components/ui/page";
import { DetailPagePattern } from "@/components/ui/patterns";
import { Badge } from "@/components/ui";
import { PropertyGrid } from "@/components/ui/PropertyGrid";
import { MetadataCard } from "@/components/ui/MetadataCard";
import { meetingApprovalAggregateStatusLabel, parseApproverPersonIds } from "@/lib/club-development/process-approval-presentation";

type PageProps = { params: Promise<{ slug: string }> };

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Entwurf",
  ACTIVE: "Aktiv",
  ARCHIVED: "Archiviert",
};

function formatSwissDate(date: Date | string) {
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export default async function ProcessDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { slug } = await params;
  const actor = await getActorContext(session.user, session.user?.activeTenantId ?? undefined);
  const process = await getClubDevelopmentProcessBySlug(slug, actor);

  const canManage = actor.permissionKeys.includes(PERMISSIONS.INITIATIVES_MANAGE);
  const actorPersonId =
    process && actor.tenantId
      ? await resolvePersonIdForUser(actor.tenantId, actor.userId)
      : null;

  let voteViews: MeetingApprovalVoteView[] = [];
  const approverLabels: Record<string, string> = {};

  if (process && actor.tenantId) {
    const votes = await getProcessApprovalVotes(process.id, actor.tenantId);
    const approverIds = [
      ...parseApproverPersonIds(process.approverPersonIds),
      ...votes.map((v: { approverPersonId: string }) => v.approverPersonId),
    ];
    const uniqueIds = [...new Set(approverIds)];
    if (uniqueIds.length > 0) {
      const people = await prisma.person.findMany({
        where: { tenantId: actor.tenantId, id: { in: uniqueIds } },
        select: { id: true, displayName: true, firstName: true, lastName: true },
      });
      for (const p of people) {
        approverLabels[p.id] = personLabelFromRecord(p);
      }
    }
    voteViews = votes.map((v: (typeof votes)[number]) => ({
      approverPersonId: v.approverPersonId,
      approverLabel: approverLabels[v.approverPersonId] ?? "Unbekannte Person",
      decision: v.decision,
      comment: v.comment,
      decidedAt: v.decidedAt,
    }));
  }

  const pageTitle = process?.title ?? slug;

  return (
    <PageShell fullWidth>
      <DetailPagePattern
        eyebrow="Prozesse"
        title={pageTitle}
        description={process?.summary ?? undefined}
        headerBadge={
          process?.status ? (
            <Badge variant={process.status === "ACTIVE" ? "success" : "default"}>
              {STATUS_LABELS[process.status] ?? process.status}
            </Badge>
          ) : undefined
        }
        breadcrumbs={[
          { label: "Vereinsleitung", href: "/vereinsleitung" },
          { label: "Prozesse", href: "/vereinsleitung/prozesse" },
          { label: pageTitle },
        ]}
        headerActions={
          <div className="flex items-center gap-2">
            {process && canManage ? (
              <Link
                href={`/vereinsleitung/prozesse/${slug}/edit`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-transparent px-3.5 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-2)]"
              >
                <Edit className="h-3.5 w-3.5" />
                Bearbeiten
              </Link>
            ) : null}
            <Link
              href="/vereinsleitung/prozesse"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-transparent px-3.5 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Zurück
            </Link>
          </div>
        }
        sidebar={
          process ? (
            <>
              <SectionCard title="Details">
                <PropertyGrid
                  items={[
                    {
                      label: "Verantwortlich",
                      value: process.owner,
                      icon: <Workflow className="h-3.5 w-3.5" />,
                      emptyText: "Nicht erfasst",
                    },
                    {
                      label: "Sichtbarkeit",
                      value: <VisibilityScopeBadge scope={process.visibilityScope} />,
                    },
                    {
                      label: "Dokumentrevision",
                      value: String(process.documentRevision),
                    },
                  ]}
                  columns={1}
                />
              </SectionCard>
              <SectionCard title="Freigabe">
                <p className="text-sm text-[var(--text-2)]">
                  {process.approvalRequired
                    ? meetingApprovalAggregateStatusLabel(process.approvalStatus)
                    : "Nicht konfiguriert"}
                </p>
                {process.approvalRequired ? (
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Inhaltsrevision: {process.approvalContentRevision}
                  </p>
                ) : null}
              </SectionCard>
              <MetadataCard
                fields={[
                  { label: "Erstellt", value: formatSwissDate(process.createdAt) },
                  { label: "Aktualisiert", value: formatSwissDate(process.updatedAt) },
                ]}
              />
            </>
          ) : undefined
        }
      >
        {process ? (
          <>
            <SectionCard title="Beschreibung">
              {process.description ? (
                <p className="text-sm leading-relaxed text-[var(--text-2)]">{process.description}</p>
              ) : (
                <p className="text-sm italic text-[var(--muted)]">Noch keine ausführliche Beschreibung erfasst.</p>
              )}
            </SectionCard>
            <SectionCard title="Optionale Freigabe">
              <ProcessApprovalPanel
                processId={process.id}
                canManage={canManage}
                actorPersonId={actorPersonId}
                contentRevision={process.approvalContentRevision}
                process={{
                  approvalRequired: process.approvalRequired,
                  approvalRule: process.approvalRule,
                  approverPersonIds: process.approverPersonIds,
                  approvalStatus: process.approvalStatus,
                }}
                votes={voteViews}
                approverLabels={approverLabels}
              />
            </SectionCard>
          </>
        ) : (
          <SectionCard title="Prozess nicht gefunden">
            <EmptyState heading="Dieser Prozess ist nicht verfügbar" description={`Slug: ${slug}`} />
          </SectionCard>
        )}
      </DetailPagePattern>
    </PageShell>
  );
}
