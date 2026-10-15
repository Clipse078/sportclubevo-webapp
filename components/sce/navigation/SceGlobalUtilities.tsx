"use client";

import { Suspense, type ReactNode } from "react";
import { Menu } from "lucide-react";
import AdminPageActions from "@/components/admin/layout/AdminPageActions";
import AccountMenu from "@/components/admin/layout/AccountMenu";
import NotificationBell from "@/components/admin/notifications/NotificationBell";
import { SceGlobalSeasonSwitcher } from "@/components/sce/navigation/SceGlobalSeasonSwitcher";
import { cn } from "@/lib/cn";

type SceGlobalUtilitiesProps = {
  platformWorkspace: boolean;
  activeSeasonLabel?: string | null;
  activeSeasonKey?: string | null;
  selectedSeasonKey?: string | null;
  seasonSwitchLabel?: string;
  globalNavDrawerOpen: boolean;
  globalNavDrawerId: string;
  openDrawerLabel: string;
  onToggleDrawer: () => void;
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
  globalNavDrawerOpen,
  globalNavDrawerId,
  openDrawerLabel,
  onToggleDrawer,
  firstName,
  lastName,
  email,
  imageUrl,
  trailingSlot,
}: SceGlobalUtilitiesProps) {
  return (
    <div className="flex shrink-0 items-center gap-1 sce-global-header-utilities" data-testid="sce-global-utilities">
      {!platformWorkspace ? (
        <div className="hidden lg:flex">
          <SceGlobalSeasonSwitcher
            activeSeasonLabel={activeSeasonLabel}
            activeSeasonKey={activeSeasonKey}
            selectedSeasonKey={selectedSeasonKey}
            switchLabel={seasonSwitchLabel}
          />
        </div>
      ) : null}

      <button
        type="button"
        className={cn(
          "sce-icon-button min-h-[2.75rem] min-w-[2.75rem]",
          globalNavDrawerOpen && "sce-global-primary-nav-item--active",
        )}
        aria-label={openDrawerLabel}
        aria-expanded={globalNavDrawerOpen}
        aria-controls={globalNavDrawerId}
        data-testid="global-nav-hamburger"
        onClick={onToggleDrawer}
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="hidden md:flex items-center gap-1">
        <Suspense fallback={null}>
          <AdminPageActions />
        </Suspense>
      </div>

      {trailingSlot}

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
