"use client";

import SceContextTabs from "@/components/sce/context-tabs/SceContextTabs";
import { SceContextTabProvider } from "@/lib/context-tabs/use-context-detail-tab";
import { buildOrgUnitRecordTabNavigationConfig } from "@/lib/nav/org-unit-record-tab-config";

type Props = {
  orgUnitId: string;
  showEdit?: boolean;
};

/** Canonical record tabs for one organisation unit. Replaces local pill nav. */
export default function OrgUnitRecordTabs({ orgUnitId, showEdit = true }: Props) {
  const config = buildOrgUnitRecordTabNavigationConfig(orgUnitId, { showEdit });
  return (
    <SceContextTabProvider config={config}>
      <SceContextTabs
        config={config}
        ariaLabel="Organisationseinheit"
        testId="org-unit-record-tabs"
        idPrefix="org-unit-record-tab"
      />
    </SceContextTabProvider>
  );
}
