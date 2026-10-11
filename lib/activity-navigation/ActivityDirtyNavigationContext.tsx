"use client";

/**
 * Activity compatibility re-exports — canonical implementation lives in `lib/context-tabs`.
 */
export {
  SceContextDirtyGuardProvider as ActivityDirtyNavigationProvider,
  useContextDirtyNavigation as useActivityDirtyNavigation,
  useOptionalContextDirtyNavigation as useOptionalActivityDirtyNavigation,
} from "@/lib/context-tabs/ContextDirtyNavigationContext";
