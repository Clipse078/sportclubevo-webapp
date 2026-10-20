"use client";

import SceContextTabs from "@/components/sce/context-tabs/SceContextTabs";
import { SceContextTabProvider } from "@/lib/context-tabs/use-context-detail-tab";
import { buildRolesAdminTabNavigationConfig } from "@/lib/roles/roles-admin-tab-config";

const rolesAdminTabConfig = buildRolesAdminTabNavigationConfig();

/**
 * Tenant Roles & Permissions — canonical `SceContextTabs` (DS-03).
 * Route-segment URLs preserve deep links and browser history.
 */
export default function RolesAdminTabs() {
  return (
    <SceContextTabProvider config={rolesAdminTabConfig}>
      <SceContextTabs
        config={rolesAdminTabConfig}
        ariaLabel="Rollen & Berechtigungen"
        testId="roles-admin-tabs"
        idPrefix="roles-admin-tab"
      />
    </SceContextTabProvider>
  );
}
