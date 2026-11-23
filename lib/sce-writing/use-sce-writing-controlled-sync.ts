import type { Editor } from "@tiptap/react";
import { useEffect } from "react";

import { emptyRichText, type RichTextValue } from "@/lib/cms/rich-text";

/**
 * Keeps a controlled TipTap editor in sync with external JSON (non-collaborative mode only).
 */
export function useSceWritingControlledSync(
  editor: Editor | null,
  value: RichTextValue | null | undefined,
  collaborationActive: boolean,
): void {
  useEffect(() => {
    if (!editor || collaborationActive) return;
    const currentJson = JSON.stringify(editor.getJSON());
    const nextJson = JSON.stringify(value ?? emptyRichText());
    if (currentJson !== nextJson) {
      editor.commands.setContent(value ?? emptyRichText());
    }
  }, [editor, value, collaborationActive]);
}