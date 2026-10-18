"use client";

import { useCallback, useRef } from "react";
import type { TournamentPlanungViewModel } from "./types";
import { resolvePlanungScheduleMutationErrorMessage } from "./planung-schedule-mutation-errors";

type QueueOptions = {
  tournamentId: string;
  getScheduleVersionId: () => string | null;
  getScheduleRevision: () => number | null;
  onScheduleRevisionChange: (revision: number | null, versionId: string | null) => void;
  onModelChange: (viewModel: TournamentPlanungViewModel) => void;
  onError: (message: string) => void;
  onPendingChange?: (pending: boolean) => void;
};

type FetchMutationResult = {
  ok: boolean;
  status: number;
  viewModel?: TournamentPlanungViewModel;
  error?: string;
  code?: string;
};

async function reloadPlanungViewModel(
  tournamentId: string,
): Promise<TournamentPlanungViewModel | null> {
  const res = await fetch(`/api/tournaments/${tournamentId}/planung`);
  if (!res.ok) return null;
  const json = (await res.json()) as { viewModel?: TournamentPlanungViewModel };
  return json.viewModel ?? null;
}

export function usePlanungScheduleMutationQueue(options: QueueOptions) {
  const chainRef = useRef(Promise.resolve());
  const inFlightRef = useRef(0);
  const lastErrorRef = useRef<string | null>(null);

  const setPending = useCallback(
    (delta: number) => {
      inFlightRef.current = Math.max(0, inFlightRef.current + delta);
      options.onPendingChange?.(inFlightRef.current > 0);
    },
    [options],
  );

  const applyViewModel = useCallback(
    (viewModel: TournamentPlanungViewModel) => {
      options.onScheduleRevisionChange(viewModel.scheduleRevision, viewModel.scheduleVersionId);
      options.onModelChange(viewModel);
    },
    [options],
  );

  const reportError = useCallback(
    (message: string) => {
      if (lastErrorRef.current === message) return;
      lastErrorRef.current = message;
      options.onError(message);
    },
    [options],
  );

  const runMutation = useCallback(
    async (
      perform: (expectedRevision: number | undefined) => Promise<FetchMutationResult>,
      retryOnStale: boolean,
    ) => {
      setPending(1);
      try {
        let expectedRevision = options.getScheduleRevision() ?? undefined;
        let result = await perform(expectedRevision);

        if (!result.ok && result.status === 409 && retryOnStale) {
          const reloaded =
            result.viewModel ?? (await reloadPlanungViewModel(options.tournamentId));
          if (reloaded) {
            applyViewModel(reloaded);
            expectedRevision = reloaded.scheduleRevision ?? undefined;
            result = await perform(expectedRevision);
          }
        }

        if (!result.ok) {
          if (result.viewModel) applyViewModel(result.viewModel);
          reportError(
            resolvePlanungScheduleMutationErrorMessage({
              httpStatus: result.status,
              code: result.code,
              serverMessage: result.error,
            }),
          );
          return;
        }

        lastErrorRef.current = null;
        if (result.viewModel) applyViewModel(result.viewModel);
      } finally {
        setPending(-1);
      }
    },
    [applyViewModel, options, reportError, setPending],
  );

  const enqueue = useCallback(
    (task: () => Promise<void>) => {
      chainRef.current = chainRef.current.then(task);
    },
    [],
  );

  const enqueueScheduleMutation = useCallback(
    (
      perform: (expectedRevision: number | undefined) => Promise<FetchMutationResult>,
      retryOnStale = true,
    ) => {
      enqueue(() => runMutation(perform, retryOnStale));
    },
    [enqueue, runMutation],
  );

  return { enqueueScheduleMutation };
}
