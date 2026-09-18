"use client";

import { CenterWorkspaceSearchInput } from "@/components/centers/CenterWorkspaceSearchInput";
import TurniereManagementViewSwitcher from "./TurniereManagementViewSwitcher";
import type { TournamentListView } from "@/lib/tournaments/workspace-view-model";

type Props = {
  searchDraft: string;
  onSearchChange: (value: string) => void;
  listView: TournamentListView;
  listeHref: string;
  kompaktHref: string;
  kalenderHref: string;
};

export default function TurniereManagementToolbar({
  searchDraft,
  onSearchChange,
  listView,
  listeHref,
  kompaktHref,
  kalenderHref,
}: Props) {
  return (
    <div className="space-y-2.5" data-testid="turniere-toolbar">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
        <CenterWorkspaceSearchInput
          value={searchDraft}
          onChange={onSearchChange}
          placeholder="Turniere durchsuchen …"
          ariaLabel="Turniere durchsuchen"
          className="relative min-w-0 flex-1"
          data-testid="turniere-search"
        />
        <TurniereManagementViewSwitcher
          listView={listView}
          listeHref={listeHref}
          kompaktHref={kompaktHref}
          kalenderHref={kalenderHref}
          kalenderDisabled
        />
      </div>
    </div>
  );
}
