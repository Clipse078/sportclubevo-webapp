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

export { DashboardHeroSection } from "./DashboardHeroSection";

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

export { DashboardCompactWelcome } from "./DashboardCompactWelcome";
export type { DashboardCompactWelcomeProps } from "./DashboardCompactWelcome";

export { PersonalProgrammeFeed } from "./PersonalProgrammeFeed";
export type { PersonalProgrammeFeedProps } from "./PersonalProgrammeFeed";

export { PersonalDashboardWorkspace } from "./PersonalDashboardWorkspace";
export type { PersonalDashboardWorkspaceProps } from "./PersonalDashboardWorkspace";

export { PersonalDashboardSecondary } from "./PersonalDashboardSecondary";
export type { PersonalDashboardSecondaryProps } from "./PersonalDashboardSecondary";

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
export type { DashboardQuickActionsProps, QuickAction, QuickActionAccent } from "./DashboardQuickActions";

export { DashboardActivityFeed } from "./DashboardActivityFeed";
export type {
  DashboardActivityFeedProps,
  DashboardActivityItem,
} from "./DashboardActivityFeed";

export { DashboardSmartNudges } from "./DashboardSmartNudges";
export type { DashboardSmartNudgesProps } from "./DashboardSmartNudges";

export { DashboardSection } from "./DashboardSection";
export type { DashboardSectionProps, DashboardSectionVariant, DashboardSectionIconAccent } from "./DashboardSection";

export { DashboardGrid } from "./DashboardGrid";
export type { DashboardGridProps } from "./DashboardGrid";

export { DashboardNewsGrid, DashboardNewsSection } from "./DashboardNewsGrid";
export type { DashboardNewsGridProps, DashboardNewsSectionProps } from "./DashboardNewsGrid";

export { DashboardEmptyState } from "./DashboardEmptyState";
export type { DashboardEmptyStateProps } from "./DashboardEmptyState";

export { MeineAgendaWidget } from "./MeineAgendaWidget";
export type { MeineAgendaWidgetProps } from "./MeineAgendaWidget";

export { MeineAufgabenWidget } from "./MeineAufgabenWidget";

export { PersonalAttention } from "./PersonalAttention";
export type { PersonalAttentionProps } from "./PersonalAttention";

export { PersonalTasksPreview } from "./PersonalTasksPreview";

export { HeuteImVereinWidget } from "./HeuteImVereinWidget";
export type { HeuteImVereinWidgetProps } from "./HeuteImVereinWidget";

export { DashboardOperationalGrid } from "./DashboardOperationalGrid";
export type { DashboardOperationalGridProps } from "./DashboardOperationalGrid";

export { DashboardCompactScheduleList } from "./DashboardCompactScheduleList";
export type { DashboardCompactScheduleListProps } from "./DashboardCompactScheduleList";

export { DashboardQuickActionStrip } from "./DashboardQuickActionStrip";
export type {
  DashboardQuickActionStripProps,
  QuickActionStripItem,
} from "./DashboardQuickActionStrip";

export { PersonalQuickAccess } from "./PersonalQuickAccess";
export type { PersonalQuickAccessItem } from "./PersonalQuickAccess";
export { QuickAccessCustomizer } from "./QuickAccessCustomizer";
