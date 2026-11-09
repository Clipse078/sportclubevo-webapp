"use client";

import type { ReactNode } from "react";
import AccountMenu from "@/components/admin/layout/AccountMenu";
import NotificationBell from "@/components/admin/notifications/NotificationBell";
import { ScePlatformBrandRail } from "@/components/sce/navigation/SceTenantIdentityBar";
import { cn } from "@/lib/cn";

type SceGlobalUtilitiesProps = {
  platformWorkspace: boolean;
  firstName: string;
  lastName: string;
  email: string;
  imageUrl?: string | null;
  trailingSlot?: ReactNode;
};

/** SCE-DS2-05B-R4 — SCE wordmark, notifications, account (no season selector). */
export function SceGlobalUtilities({
  platformWorkspace,
  firstName,
  lastName,
  email,
  imageUrl,
  trailingSlot,
}: SceGlobalUtilitiesProps) {
  return (
    <div
      className="flex min-w-0 shrink-0 items-center gap-0.5 sce-global-header-utilities md:gap-1"
      data-testid="sce-global-utilities"
      data-sce-utilities-tier="compact"
      data-sce-navbar-contextual-actions="none"
    >
      {trailingSlot}

      {!platformWorkspace ? (
        <div
          className={cn(
            "sce-global-header-platform-brand hidden shrink-0 md:flex",
          )}
          data-testid="sce-header-platform-brand"
        >
          <ScePlatformBrandRail className="sce-global-sce-brand--header-utilities" />
        </div>
      ) : null}

      <NotificationBell />
      <AccountMenu
        firstName={firstName}
        lastName={lastName}
        email={email}
        imageUrl={imageUrl}
      />
    </div>
  );
}
