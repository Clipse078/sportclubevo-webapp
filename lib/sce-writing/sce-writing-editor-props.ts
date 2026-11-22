import type { EditorOptions } from "@tiptap/core";

import { transformSceWritingPastedHtml } from "./sce-writing-paste";

export const SCE_WRITING_PLACEHOLDER_CONTENT_CLASS =
  "[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-[var(--muted)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]";

export function buildSceWritingEditorProps(options: {
  prosemirrorClassName: string;
  inputId?: string;
}): NonNullable<EditorOptions["editorProps"]> {
  return {
    attributes: {
      ...(options.inputId ? { id: options.inputId } : {}),
      class: options.prosemirrorClassName,
    },
    transformPastedHTML: transformSceWritingPastedHtml,
  };
}