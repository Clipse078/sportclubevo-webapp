import { describe, expect, it, vi } from "vitest";
import {
  OrgBuilderCommandHistory,
  createOrgBuilderCommand,
  isOrgBuilderTextEditingTarget,
} from "@/lib/org/org-builder-command-history";

describe("OrgBuilderCommandHistory", () => {
  it("undo/redo presentation command and clears future on new push", async () => {
    const history = new OrgBuilderCommandHistory();
    let value = 0;

    history.push(
      createOrgBuilderCommand({
        label: "Verschieben",
        scope: "presentation",
        undo: async () => {
          value = 0;
        },
        redo: async () => {
          value = 1;
        },
      }),
    );

    await history.undo();
    expect(value).toBe(0);
    expect(history.getSnapshot().canRedo).toBe(true);

    await history.redo();
    expect(value).toBe(1);

    history.push(
      createOrgBuilderCommand({
        label: "Auto-Layout",
        scope: "presentation",
        undo: async () => {},
        redo: async () => {},
      }),
    );
    expect(history.getSnapshot().canRedo).toBe(false);
  });

  it("restores past entry when authoritative undo fails", async () => {
    const history = new OrgBuilderCommandHistory();
    history.push(
      createOrgBuilderCommand({
        label: "Reparent",
        scope: "authoritative",
        undo: async () => {
          throw new Error("Serverfehler");
        },
        redo: async () => {},
      }),
    );

    await expect(history.undo()).rejects.toThrow("Serverfehler");
    expect(history.getSnapshot().canUndo).toBe(true);
  });
});

