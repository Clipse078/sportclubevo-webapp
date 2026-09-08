/**
 * components/ui/dashboard — SportClubEvo Dashboard Primitives
 *
 * Shared, reusable dashboard layout components.
 * All use SCE design tokens only — no hardcoded colors.
 *
 * Canonical usage:
 *   import { DashboardHero, DashboardKpiCard, DashboardSection } from "@/components/ui/dashboard";
 */

export { DashboardHero } from "./DashboardHero";
export type { DashboardHeroProps } from "./DashboardHero";

export { DashboardCommandHeader } from "./DashboardCommandHeader";
export type { DashboardCommandHeaderProps } from "./DashboardCommandHeader";

export { DashboardTodayTimeline } from "./DashboardTodayTimeline";
export type { DashboardTodayTimelineProps, DashboardTodayTimelineItem } from "./DashboardTodayTimeline";

export { DashboardTodaySchedule } from "./DashboardTodaySchedule";
export type { DashboardTodayScheduleProps } from "./DashboardTodaySchedule";

export { DashboardAttentionList } from "./DashboardAttentionList";
export type { DashboardAttentionListProps } from "./DashboardAttentionList";

export { DashboardUpcomingList } from "./DashboardUpcomingList";
export type { DashboardUpcomingListProps } from "./DashboardUpcomingList";

export { DashboardWelcome } from "./DashboardWelcome";
export type { DashboardWelcomeProps } from "./DashboardWelcome";

export { DashboardKpiCard } from "./DashboardKpiCard";
export type { DashboardKpiCardProps, DashboardKpiAccent } from "./DashboardKpiCard";

export { DashboardKpiGrid } from "./DashboardKpiGrid";
export type { DashboardKpiGridProps, DashboardKpiGridItem } from "./DashboardKpiGrid";

export { DashboardMetricStrip } from "./DashboardMetricStrip";
export type {
  DashboardMetricStripProps,
  DashboardMetric,
  DashboardMetricAccent,
} from "./DashboardMetricStrip";

export { DashboardQuickActions } from "./DashboardQuickActions";
export type { DashboardQuickActionsProps, QuickAction } from "./DashboardQuickActions";

export { DashboardActivityFeed } from "./DashboardActivityFeed";
export type {
  DashboardActivityFeedProps,
  DashboardActivityItem,
} from "./DashboardActivityFeed";

export { DashboardSmartNudges } from "./DashboardSmartNudges";
export type { DashboardSmartNudgesProps } from "./DashboardSmartNudges";

export { DashboardSection } from "./DashboardSection";
export type { DashboardSectionProps, DashboardSectionVariant } from "./DashboardSection";

export { DashboardGrid } from "./DashboardGrid";
export type { DashboardGridProps } from "./DashboardGrid";

export { DashboardEmptyState } from "./DashboardEmptyState";
export type { DashboardEmptyStateProps } from "./DashboardEmptyState";
