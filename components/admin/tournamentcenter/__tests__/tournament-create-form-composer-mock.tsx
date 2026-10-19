/**
 * Renders all composer tabs in one document for TournamentCreateForm integration tests.
 * Import this module before TournamentCreateForm in test files.
 */
import React from "react";
import { vi } from "vitest";

vi.mock("@/components/admin/tournamentcenter/composer/TournamentComposerPlannerPanels", () => ({
  TournamentComposerTurnierformatPanel: () => <div data-testid="tournament-composer-turnierformat-mock" />,
  TournamentComposerSpielfelderPanel: () => <div data-testid="tournament-composer-spielfelder-mock" />,
  TournamentComposerSpielplanPanel: () => <div data-testid="tournament-composer-spielplan-mock" />,
}));
import type { SceActivityComposerProps } from "@/lib/sce/activity-composer/types";
import type { ContextTabId } from "@/lib/context-tabs/types";

vi.mock("@/components/sce/activity-composer/SceActivityComposer", () => ({
  default: function TournamentCreateFormComposerTestMock<
    TDraft,
    TResult,
    TTabId extends ContextTabId,
  >(props: SceActivityComposerProps<TDraft, TResult, TTabId>) {
    const { definition, draft, setDraft, onSuccess, testId } = props;
    const tabCtx = {
      draft,
      setDraft,
      isSubmitting: false,
      isSavingDraft: false,
      submitError: null,
      draftSaveError: null,
      fieldErrors: undefined as Record<string, string> | undefined,
    };

    return (
      <div data-testid={testId ?? "tournament-create-composer-mock"}>
        {definition.tabs.map((tab) => (
          <section key={String(tab.key)} data-testid={`tournament-create-tab-${String(tab.key)}`}>
            {tab.render(tabCtx)}
          </section>
        ))}
        <button
          type="button"
          data-testid="sce-activity-composer-submit"
          onClick={async () => {
            const validation = definition.validateDraft(draft);
            if (!validation.valid) {
              return;
            }
            const outcome = await definition.submitDraft(draft);
            if (outcome.ok) {
              const payload = outcome.result as { eventId?: string };
              onSuccess({
                activityKind: definition.activityKind,
                outcome: "PUBLISHED",
                activityId: payload.eventId ?? "event-test",
                domainPayload: outcome.result,
              });
            }
          }}
        >
          {definition.createActionLabel}
        </button>
      </div>
    );
  },
}));
