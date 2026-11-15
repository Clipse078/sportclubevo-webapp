import type { InitiativeDisposition, InitiativeStatus } from "@prisma/client";
import { ReviewWorkflowStage } from "@prisma/client";

export const VORHABEN_WORKSPACE_CARD_STATUS_LABELS: Record<InitiativeStatus, string> = {
  PLANNED: "Geplant",
  IN_PROGRESS: "In Arbeit",
  ON_TRACK: "On Track",
  ON_HOLD: "Pausiert",
  COMPLETED: "Abgeschlossen",
  CANCELLED: "Abgesagt",
};

export type VorhabenWorkspaceCardNextMilestone = {
  title: string;
  targetDate: string | null;
};

/** Canonical collapsed-card identity shared by Prioritäten and Vorhaben workspace lists. */
export type VorhabenWorkspaceCardSummary = {
  id: string;
  slug: string;
  title: string;
  status: InitiativeStatus;
  statusLabel: string;
  ownerLabel: string | null;
  deliveryProgressPercent: number;
  nextMilestone: VorhabenWorkspaceCardNextMilestone | null;
  detailHref: string;
  summary?: string | null;
  backlogPriority?: number;
  disposition?: InitiativeDisposition;
};

export type VorhabenWorkspacePanelTargetLink = {
  targetId: string;
  title: string;
  href: string;
};

export type VorhabenWorkspacePanelMilestone = {
  id: string;
  title: string;
  statusLabel: string;
  targetDate: string | null;
};

export type VorhabenWorkspacePanelRootTask = {
  id: string;
  title: string;
  statusLabel: string;
  href: string;
};

export type VorhabenWorkspacePanelSnapshot = {
  initiativeId: string;
  reviewStage: ReviewWorkflowStage | null;
  canManageInitiatives: boolean;
  canManageTasks: boolean;
  canViewTasks: boolean;
  editHref: string;
  targetLinks: VorhabenWorkspacePanelTargetLink[];
  milestones: VorhabenWorkspacePanelMilestone[];
  rootTasks: VorhabenWorkspacePanelRootTask[];
  rootTaskTotalCount: number;
  rootTasksTruncated: boolean;
  allRootTasksHref: string | null;
};