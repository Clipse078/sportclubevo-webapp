"use client";

import { Suspense, type ReactNode } from "react";
import { Menu } from "lucide-react";
import AdminPageActions from "@/components/admin/layout/AdminPageActions";
import AccountMenu from "@/components/admin/layout/AccountMenu";
import NotificationBell from "@/components/admin/notifications/NotificationBell";
import { cn } from "@/lib/cn";

type SceGlobalUtilitiesProps = {
  platformWorkspace: boolean;
  globalNavDrawerOpen: boolean;
  globalNavDrawerId: string;
  openDrawerLabel: string;
  onToggleDrawer: () => void;
  firstName: string;
  lastName: string;
  email: string;
  imageUrl?: string | null;
  trailingSlot?: ReactNode;
  /** Wide desktop: hide explorer trigger when primary nav already shows all domains. */
  showGlobalNavExplorer?: boolean;
};

export function SceGlobalUtilities({
  platformWorkspace,
  globalNavDrawerOpen,
  globalNavDrawerId,
  openDrawerLabel,
  onToggleDrawer,
  firstName,
  lastName,
  email,
  imageUrl,
  trailingSlot,
  showGlobalNavExplorer = true,
}: SceGlobalUtilitiesProps) {
  return (
    <div
      className="flex min-w-0 shrink-0 items-center gap-0.5 sce-global-header-utilities md:gap-1"
      data-testid="sce-global-utilities"
      data-sce-utilities-tier={showGlobalNavExplorer ? "with-explorer" : "compact"}
    >
      {showGlobalNavExplorer ? (
        <button
          type="button"
          className={cn(
            "sce-icon-button sce-global-nav-explorer-trigger min-h-[2.25rem] min-w-[2.25rem]",
            globalNavDrawerOpen && "sce-global-primary-nav-item--active",
          )}
          aria-label={openDrawerLabel}
          aria-expanded={globalNavDrawerOpen}
          aria-controls={globalNavDrawerId}
          data-testid="global-nav-hamburger"
          onClick={onToggleDrawer}
        >
          <Menu className="h-[1.125rem] w-[1.125rem]" aria-hidden="true" />
        </button>
      ) : null}

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
