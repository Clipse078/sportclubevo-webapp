/**
 * Screen 1 dressing-room badge row — one pill per assigned room.
 */

import type { ReactElement } from "react";

import { splitAllocationListDisplay } from "@/lib/publishing/presentation/allocation-display-resolver";

import styles from "./InfoboardScreen1.module.css";

export function formatDressingRoomLabel(label: string): string {
  return label.replace(/^kabine\s+/i, "").trim();
}

export type DressingRoomBadgesProps = {
  readonly label: string;
  readonly badgeClassName: string;
  readonly groupClassName?: string;
  readonly testId?: string;
};

export function DressingRoomBadges({
  label,
  badgeClassName,
  groupClassName,
  testId,
}: DressingRoomBadgesProps): ReactElement {
  const rooms = splitAllocationListDisplay(label).map(formatDressingRoomLabel);

  if (rooms.length === 1) {
    return (
      <span className={badgeClassName} data-testid={testId}>
        {rooms[0]}
      </span>
    );
  }

  return (
    <div
      className={groupClassName ?? styles.dressingRoomBadgeGroup}
      data-testid={testId ?? "dressing-room-badge-group"}
      data-dressing-room-count={rooms.length}
    >
      {rooms.map((room, index) => (
        <span key={`${room}-${index}`} className={badgeClassName}>
          {room}
        </span>
      ))}
    </div>
  );
}
