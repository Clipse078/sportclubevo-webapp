"use client";

import { useEffect, useState } from "react";
import { MEETINGS_INLINE_CREATE_EVENT } from "@/components/admin/meetings/CreateMeetingTrigger";
import VereinsleitungMeetingsGroupedList from "@/components/admin/vereinsleitung/VereinsleitungMeetingsGroupedList";
import CreateMeetingInlineCollapsibleCard from "@/components/admin/meetings/CreateMeetingInlineCollapsibleCard";
import SceClubDevelopmentSectionShell from "@/components/admin/club-development/SceClubDevelopmentSectionShell";
import SceClubDevelopmentEmptyState from "@/components/admin/club-development/SceClubDevelopmentEmptyState";
import { CD_MEETINGS_WORKSPACE_COPY } from "@/lib/club-development/product-copy";
import type { MeetingListItem } from "@/lib/meetings/queries";
import type { VisibilityScopeValue } from "@/components/admin/shared/VisibilityScopeSelect";

type MeetingCreateDefaults = {
  visibilityScope: VisibilityScopeValue;
  visibleOrgUnitRefs: string[];
  visibilityHint: string | null;
};

type Props = {
  meetings: MeetingListItem[];
  canManage: boolean;
  locale: string;
  timezone: string;
  createDefaults: MeetingCreateDefaults | null;
};

export default function VereinsleitungMeetingsWorkspaceClient({
  meetings,
  canManage,
  locale,
  timezone,
  createDefaults,
}: Props) {
  const [createExpanded, setCreateExpanded] = useState(false);

  useEffect(() => {
    function onExpandCreate() {
      setCreateExpanded(true);
    }
    window.addEventListener(MEETINGS_INLINE_CREATE_EVENT, onExpandCreate);
    return () => window.removeEventListener(MEETINGS_INLINE_CREATE_EVENT, onExpandCreate);
  }, []);

  return (
    <div data-testid="vereinsleitung-meetings-workspace">
      {canManage ? (
        <CreateMeetingInlineCollapsibleCard
          canCreate
          defaults={createDefaults}
          expanded={createExpanded}
          onExpandedChange={setCreateExpanded}
        />
      ) : null}

      <SceClubDevelopmentSectionShell
        title={CD_MEETINGS_WORKSPACE_COPY.listSectionTitle}
        headerAside={
          <span className="text-xs text-[var(--muted)] tabular-nums">{meetings.length}</span>
        }
        bodyClassName="p-5 space-y-6"
        testId="vereinsleitung-meetings-list-section"
      >
        {meetings.length === 0 ? (
          <SceClubDevelopmentEmptyState message="Noch keine Sitzungen erfasst oder keine für dich sichtbaren Einträge." />
        ) : (
          <VereinsleitungMeetingsGroupedList
            meetings={meetings}
            canManage={canManage}
            locale={locale}
            timezone={timezone}
          />
        )}
      </SceClubDevelopmentSectionShell>
    </div>
  );
}