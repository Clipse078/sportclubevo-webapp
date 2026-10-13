import type { ContextTabId } from "@/lib/context-tabs/types";
import type { SceActivityCreateValidationResult } from "./types";

/** Ordered walk for first invalid tab — mirrors Club Event create workflow. */
export function resolveFirstInvalidTab<TTabId extends ContextTabId>(
  orderedTabKeys: readonly TTabId[],
  tabErrors: Partial<Record<TTabId, boolean>>,
): TTabId | undefined {
  return orderedTabKeys.find((key) => tabErrors[key]) as TTabId | undefined;
}

export function mergeValidationWithFirstTab<TTabId extends ContextTabId>(
  orderedTabKeys: readonly TTabId[],
  result: SceActivityCreateValidationResult<TTabId>,
): SceActivityCreateValidationResult<TTabId> {
  if (result.valid) {
    return result;
  }
  const firstInvalidTab =
    result.firstInvalidTab ?? resolveFirstInvalidTab(orderedTabKeys, result.tabErrors);
  return {
    ...result,
    firstInvalidTab,
  };
}
