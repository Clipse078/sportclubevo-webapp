"use client";

import type { ReactNode } from "react";
import AccountMenu from "@/components/admin/layout/AccountMenu";
import NotificationBell from "@/components/admin/notifications/NotificationBell";
import { SceGlobalSeasonSwitcher } from "@/components/sce/navigation/SceGlobalSeasonSwitcher";
import { ScePlatformBrandRail } from "@/components/sce/navigation/SceTenantIdentityBar";
import { cn } from "@/lib/cn";

type SceGlobalUtilitiesProps = {
  platformWorkspace: boolean;
  activeSeasonLabel?: string | null;
  activeSeasonKey?: string | null;
  selectedSeasonKey?: string | null;
  seasonSwitchLabel?: string;
  firstName: string;
  lastName: string;
  email: string;
  imageUrl?: string | null;
  trailingSlot?: ReactNode;
};

export function SceGlobalUtilities({
  platformWorkspace,
  activeSeasonLabel,
  activeSeasonKey,
  selectedSeasonKey,
  seasonSwitchLabel,
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
        <>
          <div className="hidden md:flex lg:hidden">
            <SceGlobalSeasonSwitcher
              activeSeasonLabel={activeSeasonLabel}
              activeSeasonKey={activeSeasonKey}
              selectedSeasonKey={selectedSeasonKey}
              switchLabel={seasonSwitchLabel}
              displayMode="medium"
            />
          </div>
          <div className="hidden lg:flex">
            <SceGlobalSeasonSwitcher
              activeSeasonLabel={activeSeasonLabel}
              activeSeasonKey={activeSeasonKey}
              selectedSeasonKey={selectedSeasonKey}
              switchLabel={seasonSwitchLabel}
              displayMode="wide"
            />
          </div>
          <div
            className={cn(
              "sce-global-header-platform-brand hidden shrink-0 md:flex",
            )}
            data-testid="sce-header-platform-brand"
          >
            <ScePlatformBrandRail className="sce-global-sce-brand--header-utilities" />
          </div>
        </>
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
