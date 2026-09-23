import type {
  WorkspaceSubtreeOperationStatus,
  WorkspaceSubtreeOperationType,
} from "@prisma/client";

/** Mobile-safe progress DTO (counts and status only). */
export type WorkspaceSubtreeOperationStatusDto = {
  operationId: string;
  type: WorkspaceSubtreeOperationType;
  status: WorkspaceSubtreeOperationStatus;
  processedCount: number;
  totalEstimated: number | null;
  blockedCount: number;
  failedCount: number;
  createdAt: string;
  completedAt: string | null;
};

export type WorkspaceSubtreeMutationMode =
  | { mode: "SYNC" }
  | {
      mode: "ASYNC";
      operationId: string;
      status: WorkspaceSubtreeOperationStatus;
    };
