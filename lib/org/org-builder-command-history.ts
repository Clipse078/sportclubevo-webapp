/**
 * Session-scoped command history for Organisation Builder (DS-10 R7.2).
 * Presentation actions restore local layout; authoritative actions use server mutations.
 */

export type OrgBuilderCommandScope = "presentation" | "authoritative";

export type OrgBuilderCommand = {
  id: string;
  label: string;
  scope: OrgBuilderCommandScope;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
};

export type OrgBuilderHistorySnapshot = {
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | null;
  redoLabel: string | null;
};

function newCommandId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createOrgBuilderCommand(
  input: Omit<OrgBuilderCommand, "id"> & { id?: string },
): OrgBuilderCommand {
  return { id: input.id ?? newCommandId(), ...input };
}

export class OrgBuilderCommandHistory {
  private past: OrgBuilderCommand[] = [];
  private future: OrgBuilderCommand[] = [];

  getSnapshot(): OrgBuilderHistorySnapshot {
    const undoCmd = this.past[this.past.length - 1];
    const redoCmd = this.future[this.future.length - 1];
    return {
      canUndo: this.past.length > 0,
      canRedo: this.future.length > 0,
      undoLabel: undoCmd?.label ?? null,
      redoLabel: redoCmd?.label ?? null,
    };
  }

  push(command: OrgBuilderCommand): void {
    this.past.push(command);
    this.future = [];
  }

  async undo(): Promise<OrgBuilderCommand | null> {
    const command = this.past.pop();
    if (!command) return null;
    try {
      await command.undo();
      this.future.push(command);
      return command;
    } catch (error) {
      this.past.push(command);
      throw error;
    }
  }

  async redo(): Promise<OrgBuilderCommand | null> {
    const command = this.future.pop();
    if (!command) return null;
    try {
      await command.redo();
      this.past.push(command);
      return command;
    } catch (error) {
      this.future.push(command);
      throw error;
    }
  }

  clear(): void {
    this.past = [];
    this.future = [];
  }
}

export function isOrgBuilderTextEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest("[contenteditable='true'], [contenteditable='']"));
}
