import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  WORKSPACE_ASYNC_SUBTREE_THRESHOLD_DEFAULT,
  workspaceSubtreeRequiresAsyncExecution,
} from "@/lib/workspace/subtree/subtree-scale-config";

const queryRawMock = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => queryRawMock(...args),
    $transaction: (fn: (tx: unknown) => unknown) =>
      fn({ $queryRaw: queryRawMock, workspaceFolder: { updateMany: vi.fn() }, workspaceDocument: { updateMany: vi.fn() } }),
  },
}));

describe("WORKSPACE-08-07 subtree planner", () => {
  beforeEach(() => {
    queryRawMock.mockReset();
  });

  it("threshold boundary: totalNodes equal to default stays synchronous", () => {
    expect(
      workspaceSubtreeRequiresAsyncExecution({
        folderCount: 500,
        documentCount: 500,
        totalNodes: WORKSPACE_ASYNC_SUBTREE_THRESHOLD_DEFAULT,
        probeLimitExceeded: false,
      }),
    ).toBe(false);
  });

  it("threshold boundary: totalNodes above default requires async", () => {
    expect(
      workspaceSubtreeRequiresAsyncExecution({
        folderCount: 600,
        documentCount: 401,
        totalNodes: WORKSPACE_ASYNC_SUBTREE_THRESHOLD_DEFAULT + 1,
        probeLimitExceeded: false,
      }),
    ).toBe(true);
  });

  it("probeLimitExceeded forces async without materializing full 10k tree", async () => {
    queryRawMock.mockResolvedValue([
      {
        folder_count: 1001,
        document_count: 1001,
        folder_probe_hit: true,
        document_probe_hit: true,
      },
    ]);

    const { probeWorkspaceSubtreeNodeCount } = await import(
      "@/lib/workspace/subtree/subtree-planner"
    );

    const count = await probeWorkspaceSubtreeNodeCount({
      tenantId: "t1",
      rootFolderId: "f1",
      probeLimit: 1000,
    });

    expect(count.probeLimitExceeded).toBe(true);
    expect(count.totalNodes).toBe(2002);
    expect(queryRawMock).toHaveBeenCalledTimes(1);
  });
});
