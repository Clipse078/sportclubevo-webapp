"use client";

import Link from "next/link";
import { ChevronDown, ExternalLink, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { CD_VORHABEN_WORKSPACE_COPY } from "@/lib/club-development/product-copy";
import type { ReviewWorkflowStage } from "@prisma/client";
import InitiativeStageActions from "@/components/admin/initiatives/InitiativeStageActions";
import InitiativeMilestonesSection from "./InitiativeMilestonesSection";
import InitiativeTargetLinksSection from "./InitiativeTargetLinksSection";
import { Badge } from "@/components/ui";
import type {
  VorhabenWorkspaceCardSummary,
  VorhabenWorkspacePanelSnapshot,
} from "@/lib/club-development/vorhaben-workspace-card-types";
import { clubDevelopmentFetchJson } from "@/lib/club-development/client-fetch";
import ClubDevelopmentFormError from "./ClubDevelopmentFormError";

const DISPOSITION_LABELS: Record<Exclude<VorhabenWorkspaceCardSummary["disposition"], undefined | "NONE">, string> =
  {
    DEFERRED: "Zurückgestellt",
    REJECTED: "Abgelehnt",
    ARCHIVED: "Archiviert",
  };

function formatSwissDate(iso: string | null) {
  if (!iso) return null;
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

type Props = {
  summary: VorhabenWorkspaceCardSummary;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  showBacklogMeta?: boolean;
};

export default function VorhabenCollapsibleCard({
  summary,
  expanded,
  onExpandedChange,
  showBacklogMeta = false,
}: Props) {
  const panelId = `vorhaben-workspace-panel-${summary.id}`;
  const [panel, setPanel] = useState<VorhabenWorkspacePanelSnapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fetchStartedRef = useRef(false);

  const loadPanel = useCallback(() => {
    if (panel) return;
    startTransition(async () => {
      setLoadError(null);
      const returnTo =
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : undefined;
      const params = new URLSearchParams();
      if (returnTo) params.set("returnTo", returnTo);
      const result = await clubDevelopmentFetchJson<{ panel: VorhabenWorkspacePanelSnapshot }>(
        `/api/club-development/initiatives/${encodeURIComponent(summary.id)}/workspace-panel?${params.toString()}`,
      );
      if (!result.ok) {
        setLoadError(result.message);
        return;
      }
      setPanel(result.data.panel);
    });
  }, [panel, summary.id]);

  useEffect(() => {
    if (!expanded || fetchStartedRef.current) return;
    fetchStartedRef.current = true;
    loadPanel();
  }, [expanded, loadPanel]);

  const reviewStage = panel?.reviewStage as ReviewWorkflowStage | null | undefined;

  return (
    <article
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm"
      data-testid={`vorhaben-collapsible-${summary.id}`}
      data-expanded={expanded ? "true" : "false"}
    >
      <div className="px-4 py-3">
        <button
          type="button"
          className="flex w-full min-w-0 items-start gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
          aria-expanded={expanded}
          aria-controls={panelId}
          data-testid={`vorhaben-collapsible-toggle-${summary.id}`}
          onClick={() => onExpandedChange(!expanded)}
        >
          <ChevronDown
            className={`mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)] transition-transform ${expanded ? "rotate-180" : ""}`}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-semibold text-[var(--foreground)]">{summary.title}</span>
              {showBacklogMeta && summary.disposition && summary.disposition !== "NONE" ? (
                <Badge variant="secondary" size="sm">
                  {DISPOSITION_LABELS[summary.disposition as keyof typeof DISPOSITION_LABELS]}
                </Badge>
              ) : null}
            </div>
            {summary.summary ? (
              <p className="mt-0.5 text-xs text-[var(--text-2)] line-clamp-2">{summary.summary}</p>
            ) : null}
            <p className="mt-1 text-xs text-[var(--muted)]">
              {summary.statusLabel}
              {summary.ownerLabel ? ` · ${summary.ownerLabel}` : ""}
              {showBacklogMeta && summary.backlogPriority != null
                ? ` · Priorität ${summary.backlogPriority}`
                : ""}
            </p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              Umsetzungsfortschritt: {summary.deliveryProgressPercent}%
              {summary.nextMilestone
                ? ` · Nächster Meilenstein: ${summary.nextMilestone.title}${
                    summary.nextMilestone.targetDate
                      ? ` (${formatSwissDate(summary.nextMilestone.targetDate)})`
                      : ""
                  }`
                : ""}
            </p>
          </div>
        </button>
      </div>

      <div id={panelId} hidden={!expanded} className="border-t border-[var(--border)] p-4">
        {pending && !panel ? (
          <div className="mb-3 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--muted)]" aria-label="Lädt" />
          </div>
        ) : null}
        {loadError ? <ClubDevelopmentFormError message={loadError} className="mb-3" /> : null}

        {panel ? (
          <div className="space-y-4">
            {reviewStage ? (
              <div data-testid={`vorhaben-collapsible-stage-${summary.id}`}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Freigabe
                </p>
                <InitiativeStageActions initiativeId={summary.id} currentStage={reviewStage} />
              </div>
            ) : null}

            {panel.targetLinks.length > 0 || panel.canManageInitiatives ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Verknüpfte Ziele
                </p>
                {panel.targetLinks.length > 0 ? (
                  <ul className="mb-2 space-y-1">
                    {panel.targetLinks.map((link) => (
                      <li key={link.targetId}>
                        <Link
                          href={link.href}
                          className="text-sm font-medium text-[var(--sce-primary)] hover:underline"
                        >
                          {link.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : panel.canManageInitiatives ? null : (
                  <p className="mb-2 text-sm text-[var(--muted)]">Noch keine Zielverknüpfungen.</p>
                )}
                {panel.canManageInitiatives ? (
                  <InitiativeTargetLinksSection
                    initiativeId={summary.id}
                    canManage={panel.canManageInitiatives}
                    suppressEmptyMessage={panel.targetLinks.length === 0}
                  />
                ) : null}
              </div>
            ) : null}

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Meilensteine
              </p>
              <InitiativeMilestonesSection
                initiativeId={summary.id}
                canManage={panel.canManageInitiatives}
              />
            </div>

            {panel.canViewTasks ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {CD_VORHABEN_WORKSPACE_COPY.tasksSubheading}
                </p>
                {panel.rootTasks.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">{CD_VORHABEN_WORKSPACE_COPY.emptyTasks}</p>
                ) : (
                  <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
                    {panel.rootTasks.map((task) => (
                      <li key={task.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                        <Link
                          href={task.href}
                          className="text-sm font-medium text-[var(--foreground)] hover:text-[var(--sce-primary)]"
                        >
                          {task.title}
                        </Link>
                        <Badge variant="outline" size="sm">
                          {task.statusLabel}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
                {panel.rootTasksTruncated && panel.allRootTasksHref ? (
                  <div className="mt-2 space-y-1">
                    <p className="text-[11px] text-[var(--muted)]" data-testid="vorhaben-root-tasks-truncation">
                      {CD_VORHABEN_WORKSPACE_COPY.rootTasksTruncationNotice(
                        panel.rootTasks.length,
                        panel.rootTaskTotalCount,
                      )}
                    </p>
                    <Link
                      href={panel.allRootTasksHref}
                      className="text-xs font-medium text-[var(--sce-primary)] hover:underline"
                      data-testid="vorhaben-root-tasks-view-all"
                    >
                      {CD_VORHABEN_WORKSPACE_COPY.allRootTasksAction}
                    </Link>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Link
                href={summary.detailHref}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--sce-primary)]"
                data-testid={`vorhaben-collapsible-detail-${summary.id}`}
              >
                Detailseite öffnen
                <ExternalLink className="h-3 w-3" aria-hidden />
              </Link>
              {panel.canManageInitiatives ? (
                <Link
                  href={panel.editHref}
                  className="text-xs font-medium text-[var(--muted)] hover:text-[var(--sce-primary)]"
                >
                  Bearbeiten
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}