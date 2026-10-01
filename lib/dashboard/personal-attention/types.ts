import type { PersonalActionSourceType } from "@/lib/personal-actions/types";
import type { DomainOperationalAttentionActionExecutionKind } from "@/lib/domain-attention/types";

export type PersonalAttentionSourceType = PersonalActionSourceType | "DOMAIN_OPERATIONAL";

export type PersonalAttentionOperationalAction = {
  actionKey: string;
  executionKind: DomainOperationalAttentionActionExecutionKind;
};

export type PersonalAttentionUrgency =
  | "overdue"
  | "due_today"
  | "due_soon"
  | "action_required";

export type PersonalAttentionItem = {
  id: string;
  sourceType: PersonalAttentionSourceType;
  /** Set for DOMAIN_OPERATIONAL rows (presentation label). */
  domainKey?: string | null;
  title: string;
  summary: string | null;
  dueAt: string | null;
  urgency: PersonalAttentionUrgency;
  contextLabel: string | null;
  deepLink: string;
  actionLabel: string | null;
  /** Server-resolved COMMUNICATION_SEND / NAVIGATE metadata for dashboard CTA. */
  operationalAction?: PersonalAttentionOperationalAction | null;
  /** Screen-reader friendly status (due/overdue), not color-only. */
  presentationStatus: string | null;
  urgent: boolean;
};

export type PersonalAttentionSnapshot = {
  authorized: boolean;
  items: PersonalAttentionItem[];
  /** Authorized personally relevant attention count (after dedupe, before display cap). */
  totalCount: number;
  viewAllHref: string | null;
  /** True when one or more operational attention sources failed during aggregation. */
  operationalSourcesDegraded?: boolean;
};

export type DashboardPersonalTaskPreviewItem = {
  id: string;
  title: string;
  subtitle: string | null;
  metaLine: string | null;
  href: string | null;
  sourceLabel: string;
};

export type DashboardPersonalTasksSnapshot = {
  authorized: boolean;
  count: number | null;
  preview: DashboardPersonalTaskPreviewItem[];
};

export type DashboardPersonalWorkSnapshot = {
  attention: PersonalAttentionSnapshot;
  tasks: DashboardPersonalTasksSnapshot;
};
