"use client";

import { useMemo } from "react";
import { SceListSelectorPanel } from "@/components/sce/list-selector/SceListSelectorPanel";
import { sceGenericDiscoverFetch } from "@/lib/sce/list-selector/sce-generic-discover-client";
import type { SceListSelectorFetchParams } from "@/lib/sce/list-selector/use-sce-list-selector-query";
import type { SceRecipientSelectorProfile } from "@/lib/sce/recipient/sce-recipient-selector-config";
import type {
  SceSelectorPick,
  SceSelectorResultGroup,
  SceSelectorSelectionMode,
  SceSelectorSourceType,
} from "@/lib/sce/list-selector/types";

export type SceRecipientSelectorProps = {
  profile: SceRecipientSelectorProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: SceSelectorSelectionMode;
  committedKeys?: ReadonlySet<string>;
  onConfirm?: (picks: SceSelectorPick[]) => void;
  onPick?: (pick: SceSelectorPick) => void;
  disabled?: boolean;
  testIdPrefix?: string;
  /** Optional wrapper (e.g. workspace organisation row injection). */
  fetchResultsDecorator?: (
    base: (params: SceListSelectorFetchParams) => Promise<{
      groups: SceSelectorResultGroup[];
      noAccess?: boolean;
      error?: string;
    }>,
  ) => (params: SceListSelectorFetchParams) => Promise<{
    groups: SceSelectorResultGroup[];
    noAccess?: boolean;
    error?: string;
  }>;
  excludeUserIds?: readonly string[];
};

export function SceRecipientSelector({
  profile,
  open,
  onOpenChange,
  mode = "multiple",
  committedKeys,
  onConfirm,
  onPick,
  disabled,
  testIdPrefix = "sce-recipient-selector",
  fetchResultsDecorator,
  excludeUserIds,
}: SceRecipientSelectorProps) {
  const fetchResults = useMemo(() => {
    const base = sceGenericDiscoverFetch({
      authContext: profile.authContext,
      sourceTypes: profile.sourceTypes,
      excludeUserIds,
    });
    return fetchResultsDecorator ? fetchResultsDecorator(base) : base;
  }, [excludeUserIds, fetchResultsDecorator, profile.authContext, profile.sourceTypes]);

  return (
    <SceListSelectorPanel
      open={open}
      onOpenChange={onOpenChange}
      title={profile.dialogTitle}
      description={profile.dialogDescription}
      searchPlaceholder={profile.searchPlaceholder}
      enabledTypes={profile.sourceTypes as SceSelectorSourceType[]}
      mode={mode}
      committedKeys={committedKeys}
      fetchResults={fetchResults}
      onConfirm={onConfirm}
      onPick={onPick}
      disabled={disabled}
      testIdPrefix={testIdPrefix}
    />
  );
}
