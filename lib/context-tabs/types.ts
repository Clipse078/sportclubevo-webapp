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
  /**
   * Query param used to resolve the active tab on the current pathname (default `tab`).
   * Domain legacy URLs (e.g. Aufgaben `?bereich=`) set this instead of migrating deep links.
   */
  tabQueryParam?: string;
  /**
   * Route-segment tabs: absolute path per tab (URL-first deep links).
   * When present, `hrefForTab` uses these paths instead of `?tab=` on the current pathname.
   */
  tabRoutes?: Partial<Record<TTabId, string>>;
  /**
   * Resolve active tab from pathname when using `tabRoutes` (e.g. admin module layouts).
   * Return null to fall back to `?tab=` resolution.
   */
  resolveActiveTabFromPathname?: (
    pathname: string,
    visibleTabKeys: TTabId[],
  ) => TTabId | null;
};
