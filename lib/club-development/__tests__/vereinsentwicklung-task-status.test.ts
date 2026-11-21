import { TaskStatus } from "@prisma/client";
import {
  allowedVereinsentwicklungStatusTransitions,
  CD_VEREINSENTWICKLUNG_TASK_STATUS_LABELS,
  mapTaskStatusToVereinsentwicklungBoardColumn,
} from "../vereinsentwicklung-task-status";

describe("vereinsentwicklung task status", () => {
  it("maps PO labels for workflow columns", () => {
    expect(CD_VEREINSENTWICKLUNG_TASK_STATUS_LABELS.OPEN).toBe("Offen");
    expect(CD_VEREINSENTWICKLUNG_TASK_STATUS_LABELS.IN_PROGRESS).toBe("In Arbeit");
    expect(CD_VEREINSENTWICKLUNG_TASK_STATUS_LABELS.WAITING).toBe("Wartet");
    expect(CD_VEREINSENTWICKLUNG_TASK_STATUS_LABELS.DONE).toBe("Erledigt");
  });

  it("maps TaskStatus to board columns including Wartet", () => {
    expect(mapTaskStatusToVereinsentwicklungBoardColumn(TaskStatus.WAITING)).toBe("WAITING");
    expect(mapTaskStatusToVereinsentwicklungBoardColumn(TaskStatus.CANCELLED)).toBe("CANCELLED");
  });

  it("exposes workflow transitions for DONE reopen", () => {
    const fromDone = allowedVereinsentwicklungStatusTransitions(TaskStatus.DONE);
    expect(fromDone).toContain(TaskStatus.OPEN);
    expect(fromDone).toContain(TaskStatus.WAITING);
  });
});