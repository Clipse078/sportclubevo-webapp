"use client";

import { CalendarDays, MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import {
  SceOverflowMenu,
  SceOverflowMenuItem,
} from "@/components/sce/actions/SceOverflowMenu";
import { Trophy } from "lucide-react";

type Props = {
  canCreate: boolean;
  wochenplanerHref: string;
  activityCreateTrigger?: ReactNode;
};

export default function TurniereManagementHeaderMenu({
  canCreate,
  wochenplanerHref,
  activityCreateTrigger = null,
}: Props) {
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="flex flex-wrap items-center gap-2" data-sce-workspace-header-actions>
      {canCreate && activityCreateTrigger ? activityCreateTrigger : null}
      <div data-testid="turniere-header-overflow">
        <SceOverflowMenu
          open={overflowOpen}
          onOpenChange={setOverflowOpen}
          anchorRef={overflowRef}
          triggerLabel="Weitere Turnier-Aktionen"
          menuLabel="Turnier-Aktionen"
          triggerIcon={<MoreHorizontal className="h-4 w-4" />}
        >
        <SceOverflowMenuItem
          icon={<CalendarDays className="h-4 w-4" />}
          iconClassName="text-[var(--muted)]"
          label="Wochenplaner öffnen"
          href={wochenplanerHref}
          onSelect={() => setOverflowOpen(false)}
        />
        </SceOverflowMenu>
      </div>
    </div>
  );
}

export function TurniereManagementPageTitle() {
  return (
    <h1 className="flex items-center gap-2 text-[1.625rem] font-semibold leading-tight tracking-tight text-[var(--foreground)]">
      <Trophy className="h-7 w-7 text-[var(--sce-primary)]" aria-hidden="true" />
      Turniere
    </h1>
  );
}
