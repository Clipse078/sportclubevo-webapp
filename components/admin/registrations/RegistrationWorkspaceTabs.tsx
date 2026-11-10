"use client";

import SceContextTabs from "@/components/sce/context-tabs/SceContextTabs";
import { SceContextTabProvider } from "@/lib/context-tabs/use-context-detail-tab";
import { buildRegistrationWorkspaceTabNavigationConfig } from "@/lib/nav/registration-workspace-tab-config";

type Props = {
  tenantSlug: string;
};

/** Canonical registration workspace tabs (inbox, waiting list, archive). */
export default function RegistrationWorkspaceTabs({ tenantSlug }: Props) {
  const config = buildRegistrationWorkspaceTabNavigationConfig(tenantSlug);
  return (
    <SceContextTabProvider config={config}>
      <SceContextTabs
        config={config}
        ariaLabel="Registrierungen"
        testId="registration-workspace-tabs"
        idPrefix="registration-workspace-tab"
      />
    </SceContextTabProvider>
  );
}
