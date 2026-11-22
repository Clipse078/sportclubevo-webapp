import type { Editor } from "@tiptap/react";
import { useCallback, useEffect } from "react";

import { isAllowedEditorLinkHref, promptAndApplyEditorLink } from "./sce-writing-link";

export function useSceWritingLinkActions(editor: Editor | null) {
  const addLink = useCallback(() => {
    if (!editor) return;
    promptAndApplyEditorLink(
      () => editor.getAttributes("link").href as string | undefined,
      (href) => editor.chain().focus().extendMarkRange("link").setLink({ href }).run(),
      () => editor.chain().focus().extendMarkRange("link").unsetLink().run(),
    );
  }, [editor]);

  return { addLink };
}

/** E1/E2 — Mod+K / Ctrl+K uses the same handler as the toolbar link control. */
export function useSceWritingLinkShortcut(editor: Editor | null, disabled: boolean): () => void {
  const { addLink } = useSceWritingLinkActions(editor);

  useEffect(() => {
    if (!editor || disabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        addLink();
      }
    };
    editor.view.dom.addEventListener("keydown", onKeyDown);
    return () => editor.view.dom.removeEventListener("keydown", onKeyDown);
  }, [editor, disabled, addLink]);

  return addLink;
}

export { isAllowedEditorLinkHref };