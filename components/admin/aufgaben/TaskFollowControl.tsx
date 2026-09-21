"use client";

import { useState, useTransition } from "react";
import { Bell, BellOff } from "lucide-react";
import { cn } from "@/lib/cn";
import type { TaskFollowStateDto } from "@/lib/tasks/task-follow-service";
import {
  followTaskAction,
  unfollowTaskAction,
} from "@/app/(admin)/dashboard/aufgaben/actions";

type Props = {
  taskId: string;
  initialState: TaskFollowStateDto;
};

function formatFollowerCount(count: number): string | null {
  if (count <= 0) return null;
  if (count === 1) return "1 folgt";
  return `${count} folgen`;
}

export function TaskFollowControl({ taskId, initialState }: Props) {
  const [state, setState] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleFollow() {
    setError(null);
    startTransition(async () => {
      const result = state.isFollowing
        ? await unfollowTaskAction(taskId)
        : await followTaskAction(taskId);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setState(result.state);
    });
  }

  const countLabel = formatFollowerCount(state.followerCount);

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      data-testid="task-follow-control"
    >
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm transition-colors",
          state.isFollowing
            ? "border-[var(--primary)]/40 bg-[var(--primary)]/10 text-[var(--foreground)]"
            : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:bg-[var(--surface-2)]",
        )}
        disabled={pending}
        onClick={toggleFollow}
        data-testid={state.isFollowing ? "task-unfollow-button" : "task-follow-button"}
        aria-pressed={state.isFollowing}
      >
        {state.isFollowing ? (
          <BellOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        ) : (
          <Bell className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        )}
        {state.isFollowing ? "Nicht mehr folgen" : "Folgen"}
      </button>
      {state.isFollowing ? (
        <span className="text-xs text-[var(--muted)]" data-testid="task-follow-own-state">
          Du folgst
        </span>
      ) : null}
      {countLabel ? (
        <span className="text-xs text-[var(--muted)]" data-testid="task-follower-count">
          {countLabel}
        </span>
      ) : null}
      {error ? (
        <span className="text-xs text-red-300" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
