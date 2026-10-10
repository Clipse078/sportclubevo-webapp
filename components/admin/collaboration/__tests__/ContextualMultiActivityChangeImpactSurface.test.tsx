/**
 * SCE-COLLAB-01D-R1 — large impact list disclosure UX.
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ContextualMultiActivityChangeImpactSurface } from "@/components/admin/collaboration/ContextualMultiActivityChangeImpactSurface";
import type { MultiActivityChangeImpact } from "@/lib/collaboration/multi-activity/types";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/components/admin/collaboration/ActivityChangeCollaborationContext", () => ({
  useActivityChangeCollaboration: () => ({
    acknowledgeMultiCommunicationSent: vi.fn(),
  }),
}));

function makeImpact(count: number): MultiActivityChangeImpact {
  const items = Array.from({ length: count }, (_, i) => ({
    activityId: `session-${i}`,
    impact: {
      worthy: true,
      activityTitle: "Training",
      activityScheduleLine: `2026-10-${String(i + 1).padStart(2, "0")} · 19:00–20:15`,
      changeSet: {
        domain: "TRAINING" as const,
        activityId: `session-${i}`,
        fingerprint: `fp-${i}`,
        entries: [],
      },
      audience: {
        teamId: "team-1",
        teamName: "Team",
        recipientPreviewLabel: "Team · 2 Empfänger",
        effectiveRecipientCount: 2,
        zeroRecipients: false,
      },
      canCommunicate: true,
    },
  }));

  return {
    worthy: true,
    batchOperationId: "batch-1",
    domain: "TRAINING",
    dispatchStrategy: "COMBINED",
    activityCount: count,
    items,
    audience: {
      teamId: "team-1",
      teamName: "Team",
      recipientPreviewLabel: "Team · 2 Empfänger",
      effectiveRecipientCount: 2,
      zeroRecipients: false,
    },
    canCommunicate: true,
    batchFingerprint: "fp-batch",
  };
}

describe("ContextualMultiActivityChangeImpactSurface disclosure", () => {
  it("K/L/M — bounds list to 5, expand shows all, collapse restores", () => {
    render(
      <ContextualMultiActivityChangeImpactSurface
        trainingSeriesId="series-1"
        impact={makeImpact(8)}
        onDismiss={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    fireEvent.click(screen.getByTestId("contextual-multi-activity-change-list-toggle"));
    expect(screen.getAllByRole("listitem")).toHaveLength(8);
    fireEvent.click(screen.getByTestId("contextual-multi-activity-change-list-toggle"));
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
  });

  it("N — small impact sets omit expand control", () => {
    render(
      <ContextualMultiActivityChangeImpactSurface
        trainingSeriesId="series-1"
        impact={makeImpact(3)}
        onDismiss={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("contextual-multi-activity-change-list-toggle")).toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });
});
