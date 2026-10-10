/**
 * SCE-COLLAB-01D — multi-activity impact grouping and presentation.
 */

import { describe, expect, it } from "vitest";
import type { ActivityChangeImpact, ActivityChangeSet } from "@/lib/collaboration/activity-change/types";
import { buildMultiActivityBatchFingerprint } from "@/lib/collaboration/multi-activity/batch-fingerprint";
import {
  buildMultiActivityChangeImpact,
  buildMultiActivityChangeSetFromImpact,
  mergeAtomicImpactsIntoItems,
  resolveMultiActivityDispatchStrategy,
} from "@/lib/collaboration/multi-activity/group-multi-activity-impact";
import { buildMultiTrainingChangeAnnouncementBody } from "@/lib/collaboration/multi-activity/multi-activity-presentation";

function trainingChangeSet(sessionId: string, field: "START_TIME", oldV: string, newV: string): ActivityChangeSet {
  return {
    domain: "TRAINING",
    activityId: sessionId,
    entries: [
      {
        field,
        oldValue: oldV,
        newValue: newV,
        displayOld: oldV,
        displayNew: newV,
        significant: true,
      },
    ],
    fingerprint: `fp-${sessionId}-${newV}`,
  };
}

function atomicImpact(sessionId: string, changeSet: ActivityChangeSet, teamId = "team-1"): ActivityChangeImpact {
  return {
    worthy: true,
    activityTitle: "Training",
    activityScheduleLine: `2026-10-19 · ${changeSet.entries[0]?.displayNew}`,
    changeSet,
    audience: {
      teamId,
      teamName: "Junioren F2",
      recipientPreviewLabel: "Junioren F2 · 3 Empfänger",
      effectiveRecipientCount: 3,
      zeroRecipients: false,
    },
    canCommunicate: true,
  };
}

describe("SCE-COLLAB-01D multi-activity grouping", () => {
  it("A — single atomic impact maps to one-item group", () => {
    const cs = trainingChangeSet("s1", "START_TIME", "17:00", "18:00");
    const items = mergeAtomicImpactsIntoItems([{ activityId: "s1", impact: atomicImpact("s1", cs) }]);
    const grouped = buildMultiActivityChangeImpact({
      batchOperationId: "batch-1",
      items,
      audience: items[0]!.impact.audience,
      canCommunicate: true,
    });
    expect(grouped?.activityCount).toBe(1);
    expect(grouped?.dispatchStrategy).toBe("COMBINED");
  });

  it("B — two compatible impacts combine", () => {
    const items = mergeAtomicImpactsIntoItems([
      { activityId: "s1", impact: atomicImpact("s1", trainingChangeSet("s1", "START_TIME", "17:00", "18:00")) },
      { activityId: "s2", impact: atomicImpact("s2", trainingChangeSet("s2", "START_TIME", "18:00", "19:00")) },
    ]);
    expect(resolveMultiActivityDispatchStrategy(items)).toBe("COMBINED");
    const grouped = buildMultiActivityChangeImpact({
      batchOperationId: "batch-2",
      items,
      audience: items[0]!.impact.audience,
      canCommunicate: true,
    });
    expect(grouped?.activityCount).toBe(2);
  });

  it("C — batch fingerprint stable regardless of item order", () => {
    const a = trainingChangeSet("s1", "START_TIME", "17:00", "18:00");
    const b = trainingChangeSet("s2", "START_TIME", "17:00", "18:00");
    expect(buildMultiActivityBatchFingerprint([a, b])).toBe(buildMultiActivityBatchFingerprint([b, a]));
  });

  it("D — different teams require separate dispatch", () => {
    const items = mergeAtomicImpactsIntoItems([
      { activityId: "s1", impact: atomicImpact("s1", trainingChangeSet("s1", "START_TIME", "17:00", "18:00"), "team-a") },
      { activityId: "s2", impact: atomicImpact("s2", trainingChangeSet("s2", "START_TIME", "17:00", "18:00"), "team-b") },
    ]);
    expect(resolveMultiActivityDispatchStrategy(items)).toBe("SEPARATE_REQUIRED");
  });

  it("E — incompatible communication permission flags separate", () => {
    const base = trainingChangeSet("s1", "START_TIME", "17:00", "18:00");
    const allowed = atomicImpact("s1", base);
    const denied = { ...atomicImpact("s2", trainingChangeSet("s2", "START_TIME", "17:00", "18:00")), canCommunicate: false };
    const items = mergeAtomicImpactsIntoItems([
      { activityId: "s1", impact: allowed },
      { activityId: "s2", impact: denied },
    ]);
    expect(resolveMultiActivityDispatchStrategy(items)).toBe("SEPARATE_REQUIRED");
  });

  it("F — reverted activity drops from merged items", () => {
    const items = mergeAtomicImpactsIntoItems([
      { activityId: "s1", impact: null },
      { activityId: "s2", impact: atomicImpact("s2", trainingChangeSet("s2", "START_TIME", "17:00", "18:00")) },
    ]);
    expect(items).toHaveLength(1);
  });

  it("G — all reverted clears grouped impact", () => {
    const items = mergeAtomicImpactsIntoItems([
      { activityId: "s1", impact: null },
      { activityId: "s2", impact: null },
    ]);
    expect(buildMultiActivityChangeImpact({ batchOperationId: "b", items, audience: null, canCommunicate: true })).toBeNull();
  });

  it("H — multi change set round-trip from combined impact", () => {
    const items = mergeAtomicImpactsIntoItems([
      { activityId: "s1", impact: atomicImpact("s1", trainingChangeSet("s1", "START_TIME", "17:00", "18:00")) },
      { activityId: "s2", impact: atomicImpact("s2", trainingChangeSet("s2", "START_TIME", "18:00", "19:00")) },
    ]);
    const grouped = buildMultiActivityChangeImpact({
      batchOperationId: "batch-3",
      items,
      audience: items[0]!.impact.audience,
      canCommunicate: true,
    });
    const multiChangeSet = buildMultiActivityChangeSetFromImpact(grouped!);
    expect(multiChangeSet?.changeSets).toHaveLength(2);
    expect(multiChangeSet?.teamId).toBe("team-1");
  });

  it("presentation — grouped body lists per-activity lines", () => {
    const body = buildMultiTrainingChangeAnnouncementBody({
      summaries: [
        {
          dateKey: "2026-10-19",
          scheduleLine: "Montag, 19. Oktober 2026 · 18:00–19:00",
          entries: trainingChangeSet("s1", "START_TIME", "17:00", "18:00").entries,
        },
        {
          dateKey: "2026-10-21",
          scheduleLine: "Mittwoch, 21. Oktober 2026 · 19:00–20:00",
          entries: trainingChangeSet("s2", "START_TIME", "18:00", "19:00").entries,
        },
      ],
    });
    expect(body).toContain("Mehrere Trainings wurden geändert");
    expect(body).toContain("Startzeit: 17:00 → 18:00");
    expect(body).toContain("Startzeit: 18:00 → 19:00");
  });
});

describe("SCE-COLLAB-01D recipient union algebra", () => {
  it("deduplicates person ids in union (same recipient in two activities counted once)", async () => {
    const { unionSortedSets } = await import(
      "@/lib/communication/platform/recipient-resolution/set-algebra"
    );
    const union = unionSortedSets([
      ["person-a", "person-b"],
      ["person-b", "person-c"],
    ]);
    expect(union).toEqual(["person-a", "person-b", "person-c"]);
    expect(union.length).toBe(3);
  });
});
