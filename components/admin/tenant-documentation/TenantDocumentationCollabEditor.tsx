"use client";

import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Heading2, Link2, List, ListOrdered } from "lucide-react";
import { useCallback, useEffect } from "react";
import type * as Y from "yjs";

import { SceInlineMentionMark } from "@/lib/collaboration/mentions/inline-mention-mark";
import { SceInlineMentionSuggest } from "@/components/admin/shared/mentions/SceInlineMentionSuggest";
import type { SceMentionCandidate } from "@/components/admin/shared/mentions/SceInlineMentionSuggest";
import type { CollaborationPresence } from "@/components/admin/tenant-documentation/useTenantDocCollaboration";
import type { TaskDescriptionDocument } from "@/lib/tasks/task-description";

type Props = {
  ydoc: Y.Doc;
  fragmentName: string;
  presences: CollaborationPresence[];
  disabled?: boolean;
  actorDisplayName: string;
  onEditorReady?: (editor: Editor | null) => void;
  onContentJsonChange?: (doc: TaskDescriptionDocument) => void;
};

export function TenantDocumentationCollabEditor({
  ydoc,
  fragmentName,
  presences,
  disabled,
  onEditorReady,
  onContentJsonChange,
}: Props) {
  const searchCandidates = useCallback(async (query: string): Promise<SceMentionCandidate[]> => {
    const response = await fetch(
      `/api/tenant-documentation/mentions/candidates?q=${encodeURIComponent(query)}`,
    );
    if (!response.ok) return [];
    const payload = (await response.json()) as { options: SceMentionCandidate[] };
    return payload.options ?? [];
  }, []);

  const editor = useEditor({
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Inhalt verfassen…" }),
      SceInlineMentionMark,
      Collaboration.configure({
        document: ydoc,
        field: fragmentName,
      }),
      CollaborationCaret.configure({
        provider: null,
        user: presences[0]
          ? {
              name: presences[0].displayName,
              color: presences[0].color,
            }
          : { name: "Editor", color: "#7c3aed" },
      }),
    ],
    onUpdate: ({ editor: current }) => {
      onContentJsonChange?.(current.getJSON() as TaskDescriptionDocument);
    },
  });

  useEffect(() => {
    onEditorReady?.(editor);
    return () => onEditorReady?.(null);
  }, [editor, onEditorReady]);

  if (!editor) return null;

  const selfPresence =
    presences.find((p) => !p.disconnected) ?? presences[0] ?? null;

  return (
    <div className="relative rounded-lg border border-[var(--border)] bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-[var(--border)] px-3 py-2">
        <select
          className="rounded border border-[var(--border)] px-2 py-1 text-sm"
          value={editor.isActive("heading", { level: 2 }) ? "h2" : "p"}
          onChange={(e) => {
            if (e.target.value === "h2") {
              editor.chain().focus().toggleHeading({ level: 2 }).run();
            } else {
              editor.chain().focus().setParagraph().run();
            }
          }}
        >
          <option value="p">Absatz</option>
          <option value="h2">Überschrift 2</option>
        </select>
        <button
          type="button"
          className={`rounded p-1.5 ${editor.isActive("bold") ? "bg-orange-100 text-orange-700" : ""}`}
          onMouseDown={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleBold().run();
          }}
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="rounded p-1.5"
          onMouseDown={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleBulletList().run();
          }}
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="rounded p-1.5"
          onMouseDown={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleOrderedList().run();
          }}
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="rounded p-1.5"
          onMouseDown={(e) => {
            e.preventDefault();
            const href = window.prompt("Link-URL");
            if (href) editor.chain().focus().setLink({ href }).run();
          }}
        >
          <Link2 className="h-4 w-4" />
        </button>
        <div className="ml-auto flex items-center gap-1 text-xs text-[var(--muted)]">
          <Heading2 className="h-3.5 w-3.5 opacity-40" />
        </div>
      </div>
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none px-6 py-4 min-h-[320px] [&_.ProseMirror]:outline-none"
      />
      <SceInlineMentionSuggest
        editor={editor}
        searchCandidates={searchCandidates}
        testId="tenant-documentation-mention-suggest"
      />
      {selfPresence ? (
        <span className="sr-only" data-testid="tenant-doc-editor-presence">
          {selfPresence.displayName}
        </span>
      ) : null}
    </div>
  );
}