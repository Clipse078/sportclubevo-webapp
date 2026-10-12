"use client";

import { ScePreviewPitchCanvas } from "@/components/sce/preview/ScePreviewPitchCanvas";
import { WeekplannerMatchIdentityCard } from "@/components/admin/planner/WeekplannerMatchIdentityCard";
import type { WeekplannerMatchItem } from "@/lib/weekplanner/types";

const PREVIEW_MATCH: WeekplannerMatchItem = {
  id: "preview-wp-match",
  tenantId: "preview-tenant",
  type: "MATCH",
  startAt: new Date("2026-10-13T16:00:00.000Z"),
  endAt: new Date("2026-10-13T18:00:00.000Z"),
  canonicalStartAt: new Date("2026-10-13T16:00:00.000Z"),
  canonicalEndAt: new Date("2026-10-13T18:00:00.000Z"),
  timeOverridden: false,
  title: "FC Allschwil vs FC Basel",
  teamNames: ["FC Allschwil"],
  pitchAllocations: [],
  dressingRoomAllocations: [],
  canonicalPitchAllocations: [],
  canonicalDressingRoomAllocations: [],
  pitchOverridden: false,
  dressingRoomOverridden: false,
  conflicts: [],
  dressingRoomOccupancyMode: "DEFAULT",
  dressingRoomOccupancyBeforeMinutes: null,
  dressingRoomOccupancyAfterMinutes: null,
  dressingRoomResolvedBeforeMinutes: 0,
  dressingRoomResolvedAfterMinutes: 0,
  teamSeasonId: "ts-preview",
  eventId: "ev-preview-wp",
  eventSource: "MANUAL",
  opponentName: "FC Basel",
  homeAway: "HOME",
  homeSide: { displayName: "FC Allschwil", logoUrl: null, isOwnTeam: true },
  awaySide: { displayName: "FC Basel", logoUrl: null, isOwnTeam: false },
  awayDressingRoomAllocations: [],
};

export default function SceWeekplannerMatchPreviewPage() {
  return (
    <ScePreviewPitchCanvas className="p-6" testId="sce-preview-weekplanner-match">
      <div className="mx-auto max-w-md">
        <p className="mb-4 text-sm text-[var(--muted)]">
          Integration preview — Wochenplaner Match identity (`WeekplannerMatchIdentityCard`).
        </p>
        <WeekplannerMatchIdentityCard item={PREVIEW_MATCH} timezone="Europe/Zurich" />
      </div>
    </ScePreviewPitchCanvas>
  );
}
