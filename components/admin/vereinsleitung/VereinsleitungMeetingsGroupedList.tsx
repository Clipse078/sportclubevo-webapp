/**
 * SCE-CD-02R9 — categorized meetings overview.
 */

import VereinsleitungMeetingsList from "@/components/admin/vereinsleitung/VereinsleitungMeetingsList";
import {
  groupMeetingsByCategory,
  MEETING_LIST_CATEGORY_LABELS,
  type MeetingListCategory,
} from "@/lib/meetings/meeting-list-categories";
import type { MeetingListItem } from "@/lib/meetings/queries";

const CATEGORY_ORDER: MeetingListCategory[] = [
  "upcoming",
  "past_open",
  "completed",
  "cancelled",
];

type Props = {
  meetings: MeetingListItem[];
  canManage?: boolean;
  locale?: string;
  timezone?: string;
};

export default function VereinsleitungMeetingsGroupedList({
  meetings,
  canManage,
  locale,
  timezone,
}: Props) {
  const groups = groupMeetingsByCategory(meetings);

  return (
    <div className="space-y-6" data-testid="vereinsleitung-meetings-grouped">
      {CATEGORY_ORDER.map((key) => {
        const items = groups[key];
        if (items.length === 0) return null;
        return (
          <section key={key} data-testid={`meetings-category-${key}`}>
            <div className="mb-2 flex items-center justify-between gap-2 border-b border-[var(--border)]/80 pb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-2)]">
                {MEETING_LIST_CATEGORY_LABELS[key]}
              </h3>
              <span className="text-xs text-[var(--muted)] tabular-nums">{items.length}</span>
            </div>
            <VereinsleitungMeetingsList
              meetings={items}
              canManage={canManage}
              locale={locale}
              timezone={timezone}
            />
          </section>
        );
      })}
    </div>
  );
}
