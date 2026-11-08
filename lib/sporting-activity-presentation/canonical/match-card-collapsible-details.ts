"use client";

import { useCallback, useState } from "react";

export function sceMatchCardOperationalDetailsPanelId(matchId: string): string {
  return `sce-match-operational-details-${matchId}`;
}

export type UseSceMatchCardCollapsibleDetailsOptions = {
  /** Defaults to false — preparation panels stay collapsed on each visit. */
  defaultExpanded?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
};

export type UseSceMatchCardCollapsibleDetailsResult = {
  expanded: boolean;
  setExpanded: (next: boolean) => void;
  toggle: () => void;
  isControlled: boolean;
};

export function useSceMatchCardCollapsibleDetails({
  defaultExpanded = false,
  expanded: expandedProp,
  onExpandedChange,
}: UseSceMatchCardCollapsibleDetailsOptions = {}): UseSceMatchCardCollapsibleDetailsResult {
  const [uncontrolledExpanded, setUncontrolledExpanded] = useState(defaultExpanded);
  const isControlled = expandedProp !== undefined;
  const expanded = isControlled ? expandedProp : uncontrolledExpanded;

  const setExpanded = useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setUncontrolledExpanded(next);
      }
      onExpandedChange?.(next);
    },
    [isControlled, onExpandedChange],
  );

  const toggle = useCallback(() => {
    setExpanded(!expanded);
  }, [expanded, setExpanded]);

  return { expanded, setExpanded, toggle, isControlled };
}
