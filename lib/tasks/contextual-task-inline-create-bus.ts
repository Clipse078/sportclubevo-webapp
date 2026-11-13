export const CONTEXTUAL_TASK_INLINE_CREATE_EVENT = "sce-context-open-inline-task-create";

export type ContextualTaskInlineCreateEventDetail = {
  contextId: string;
};

export function dispatchContextualTaskInlineCreate(contextId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<ContextualTaskInlineCreateEventDetail>(
      CONTEXTUAL_TASK_INLINE_CREATE_EVENT,
      { detail: { contextId } },
    ),
  );
}
