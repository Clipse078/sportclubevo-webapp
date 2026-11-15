import type { InitiativeDisposition, InitiativeStatus } from "@prisma/client";
import { initiativeDeliveryProgressPercentFromSnapshot } from "@/lib/club-development/initiative-delivery-progress-presentation";
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
  deliveryProgressPercent: number;
  nextMilestone?: VorhabenWorkspaceCardNextMilestone | null;
}): VorhabenWorkspaceCardSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    statusLabel: VORHABEN_WORKSPACE_CARD_STATUS_LABELS[row.status],
    ownerLabel: row.owner?.trim() || null,
    deliveryProgressPercent: initiativeDeliveryProgressPercentFromSnapshot({
      progress: row.deliveryProgressPercent,
    }),
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
  deliveryProgressPercent: number;
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
    deliveryProgressPercent: initiativeDeliveryProgressPercentFromSnapshot({
      progress: row.deliveryProgressPercent,
    }),
    nextMilestone: formatVorhabenCardMilestone(row.nextMilestone),
    detailHref: row.detailHref,
    summary: row.summary ?? null,
  };
}