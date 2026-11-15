import type { InitiativeDisposition, InitiativeStatus } from "@prisma/client";
import {
  VORHABEN_WORKSPACE_CARD_STATUS_LABELS,
  type VorhabenWorkspaceCardSummary,
  type VorhabenWorkspaceCardNextMilestone,
} from "./vorhaben-workspace-card-types";

export function formatVorhabenCardMilestone(
  milestone: VorhabenWorkspaceCardNextMilestone | null | undefined,
): VorhabenWorkspaceCardNextMilestone | null {
  if (!milestone?.title?.trim()) return null;
  return milestone;
}

export function mapBacklogRowToVorhabenCardSummary(row: {
  id: string;
  slug: string;
  title: string;
  status: InitiativeStatus;
  owner: string | null;
  summary: string | null;
  backlogPriority: number;
  disposition: InitiativeDisposition;
  progress?: number | null;
  nextMilestone?: VorhabenWorkspaceCardNextMilestone | null;
}): VorhabenWorkspaceCardSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    statusLabel: VORHABEN_WORKSPACE_CARD_STATUS_LABELS[row.status],
    ownerLabel: row.owner?.trim() || null,
    deliveryProgressPercent: Math.min(100, Math.max(0, row.progress ?? 0)),
    nextMilestone: formatVorhabenCardMilestone(row.nextMilestone),
    detailHref: `/vereinsleitung/initiativen/${encodeURIComponent(row.slug)}`,
    summary: row.summary,
    backlogPriority: row.backlogPriority,
    disposition: row.disposition,
  };
}

export function mapWorkspaceInitiativeToVorhabenCardSummary(row: {
  id: string;
  slug: string;
  title: string;
  status: InitiativeStatus;
  statusLabel: string;
  progress: number;
  detailHref: string;
  ownerLabel?: string | null;
  nextMilestone?: VorhabenWorkspaceCardNextMilestone | null;
  summary?: string | null;
}): VorhabenWorkspaceCardSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    statusLabel: row.statusLabel,
    ownerLabel: row.ownerLabel?.trim() || null,
    deliveryProgressPercent: Math.min(100, Math.max(0, row.progress)),
    nextMilestone: formatVorhabenCardMilestone(row.nextMilestone),
    detailHref: row.detailHref,
    summary: row.summary ?? null,
  };
}