import type { PersonalActionSourceType } from "@/lib/personal-actions/types";

export type PersonalAttentionUrgency =
  | "overdue"
  | "due_today"
  | "due_soon"
  | "action_required";

export type PersonalAttentionItem = {
  id: string;
  sourceType: PersonalActionSourceType;
  title: string;
  summary: string | null;
  dueAt: string | null;
  urgency: PersonalAttentionUrgency;
  contextLabel: string | null;
  deepLink: string;
  actionLabel: string | null;
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
