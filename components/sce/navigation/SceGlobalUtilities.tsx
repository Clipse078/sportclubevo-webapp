"use client";

import type { ReactNode } from "react";
import AccountMenu from "@/components/admin/layout/AccountMenu";
import NotificationBell from "@/components/admin/notifications/NotificationBell";

type SceGlobalUtilitiesProps = {
  platformWorkspace: boolean;
  firstName: string;
  lastName: string;
  email: string;
  imageUrl?: string | null;
  trailingSlot?: ReactNode;
};

export function SceGlobalUtilities({
  platformWorkspace: _platformWorkspace,
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
