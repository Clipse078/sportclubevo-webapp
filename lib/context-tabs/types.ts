/**
 * SCE-UI-ROLLOUT-01B — generic contextual detail navigation types.
 * Domain-agnostic contract; activity keys live in `lib/activity-navigation/types.ts`.
 */

export type ContextTabId = string;

export type ContextTabPlacement = "primary" | "overflow";

export type ContextTabDefinition<TTabId extends ContextTabId = ContextTabId> = {
  key: TTabId;
  label: string;
  placement: ContextTabPlacement;
  /** When false, tab is omitted from navigation entirely. */
  visible?: boolean;
  count?: number | string | null;
  /** Optional accessible name override (defaults to label). */
  ariaLabel?: string;
};

export type ContextTabNavigationConfig<TTabId extends ContextTabId = ContextTabId> = {
  /** Domain identifier for diagnostics/tests (not used for rendering). */
  contextKind: string;
  defaultTab: TTabId;
  tabs: ContextTabDefinition<TTabId>[];
  /** Optional legacy `?tab=` normalization before resolving visible tabs. */
  resolveTabParam?: (raw: string | null | undefined) => string | null | undefined;
};
