import { WorkspaceBackgroundJobStatus } from "@prisma/client";

export type WorkspaceBackgroundJobTerminalStatus =
  | typeof WorkspaceBackgroundJobStatus.SUCCEEDED
  | typeof WorkspaceBackgroundJobStatus.DEAD;

const LEGAL_JOB_TRANSITIONS = new Map<
  WorkspaceBackgroundJobStatus,
  ReadonlySet<WorkspaceBackgroundJobStatus>
>([
  [
    WorkspaceBackgroundJobStatus.PENDING,
    new Set([
      WorkspaceBackgroundJobStatus.RUNNING,
      WorkspaceBackgroundJobStatus.DEAD,
    ]),
  ],
  [
    WorkspaceBackgroundJobStatus.RETRY,
    new Set([
      WorkspaceBackgroundJobStatus.RUNNING,
      WorkspaceBackgroundJobStatus.DEAD,
    ]),
  ],
  [
    WorkspaceBackgroundJobStatus.RUNNING,
    new Set([
      WorkspaceBackgroundJobStatus.SUCCEEDED,
      WorkspaceBackgroundJobStatus.RETRY,
      WorkspaceBackgroundJobStatus.DEAD,
      WorkspaceBackgroundJobStatus.RUNNING,
    ]),
  ],
  [WorkspaceBackgroundJobStatus.SUCCEEDED, new Set([])],
  [WorkspaceBackgroundJobStatus.DEAD, new Set([])],
]);

export function assertLegalWorkspaceBackgroundJobTransition(input: {
  from: WorkspaceBackgroundJobStatus;
  to: WorkspaceBackgroundJobStatus;
}): void {
  if (input.from === input.to) {
    return;
  }

  const allowed = LEGAL_JOB_TRANSITIONS.get(input.from);
  if (!allowed?.has(input.to)) {
    throw new Error(
      `Illegal workspace background job transition: ${input.from} -> ${input.to}`,
    );
  }
}

export function isWorkspaceBackgroundJobTerminal(
  status: WorkspaceBackgroundJobStatus,
): boolean {
  return (
    status === WorkspaceBackgroundJobStatus.SUCCEEDED ||
    status === WorkspaceBackgroundJobStatus.DEAD
  );
}

export function isWorkspaceBackgroundJobClaimable(
  status: WorkspaceBackgroundJobStatus,
  availableAt: Date,
  leaseExpiresAt: Date | null,
  now: Date,
): boolean {
  if (
    status === WorkspaceBackgroundJobStatus.PENDING ||
    status === WorkspaceBackgroundJobStatus.RETRY
  ) {
    return availableAt.getTime() <= now.getTime();
  }

  if (status === WorkspaceBackgroundJobStatus.RUNNING) {
    return (
      leaseExpiresAt !== null && leaseExpiresAt.getTime() < now.getTime()
    );
  }

  return false;
}
