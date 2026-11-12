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
};

export default function VereinsleitungMeetingsGroupedList({ meetings, canManage }: Props) {
  const groups = groupMeetingsByCategory(meetings);

  return (
    <div className="space-y-8" data-testid="vereinsleitung-meetings-grouped">
      {CATEGORY_ORDER.map((key) => {
        const items = groups[key];
        if (items.length === 0) return null;
        return (
          <section key={key} data-testid={`meetings-category-${key}`}>
            <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
              {MEETING_LIST_CATEGORY_LABELS[key]}
              <span className="ml-2 text-[var(--muted)]">({items.length})</span>
            </h2>
            <VereinsleitungMeetingsList meetings={items} canManage={canManage} />
          </section>
        );
      })}
    </div>
  );
}
