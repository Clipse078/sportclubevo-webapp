/**
 * Canonical SCE Context Tabs entry point (SCE-UI-ROLLOUT-01B).
 */
export type {
  ContextTabDefinition,
  ContextTabId,
  ContextTabNavigationConfig,
  ContextTabPlacement,
} from "./types";

export {
  listAllVisibleTabs,
  listKeyboardNavigablePrimaryTabs,
  listVisibleOverflowTabs,
  listVisiblePrimaryTabs,
} from "./registry";

export {
  CONTEXT_TAB_QUERY_PARAM,
  buildContextTabHref,
  readContextTabParam,
  resolveContextTabFromSearchParams,
} from "./url";

export {
  SceContextDirtyGuardProvider,
  useContextDirtyNavigation,
  useOptionalContextDirtyNavigation,
} from "./ContextDirtyNavigationContext";

export { SceContextTabProvider, useContextDetailTab } from "./use-context-detail-tab";

export { default as SceContextTabPanel } from "./ContextTabPanel";

export {
  buildExampleTeamContextTabConfig,
  listExampleTeamVisibleTabKeys,
  type ExampleTeamTabId,
  type ExampleTeamTabVisibility,
} from "./fixtures/example-team-context-tabs";
