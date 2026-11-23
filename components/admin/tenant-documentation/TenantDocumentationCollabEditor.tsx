"use client";

import "@/lib/tenant-documentation/tenant-doc-yjs-client";

import type { Editor } from "@tiptap/react";
import { useCallback, useMemo, useState, type ReactNode } from "react";

import { SceInlineMentionSuggest } from "@/components/admin/shared/mentions/SceInlineMentionSuggest";
import type { SceMentionCandidate } from "@/components/admin/shared/mentions/SceInlineMentionSuggest";
import { SceWritingEngine } from "@/components/sce-writing/SceWritingEngine";
import { buildSceWritingCollaborationExtensions } from "@/lib/sce-writing/sce-writing-collaboration";
import type { CollaborationPresence } from "@/components/admin/tenant-documentation/useTenantDocCollaboration";
import type { TaskDescriptionDocument } from "@/lib/tasks/task-description";
import type { YDoc } from "@/lib/tenant-documentation/tenant-doc-yjs-client";

type Props = {
  ydoc: YDoc;
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
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);

  const searchCandidates = useCallback(async (query: string): Promise<SceMentionCandidate[]> => {
    const response = await fetch(
      `/api/tenant-documentation/mentions/candidates?q=${encodeURIComponent(query)}`,
    );
    if (!response.ok) return [];
    const payload = (await response.json()) as { options: SceMentionCandidate[] };
    return payload.options ?? [];
  }, []);

  const handleEditorReady = useCallback(
    (editor: Editor | null) => {
      setEditorInstance(editor);
      onEditorReady?.(editor);
    },
    [onEditorReady],
  );

  const collaborationExtensions = useMemo(
    () => buildSceWritingCollaborationExtensions({ document: ydoc, field: fragmentName }),
    [ydoc, fragmentName],
  );

  const selfPresence =
    presences.find((p) => !p.disconnected) ?? presences[0] ?? null;

  return (
    <PresenceShell
      selfPresence={selfPresence}
      editor={
        <SceWritingEngine
          profile="documentation"
          collaborationExtensions={collaborationExtensions}
          collaborationMode
          disabled={disabled}
          immediatelyRender={false}
          placeholder="Inhalt verfassen…"
          minHeightClassName="min-h-[320px]"
          shellClassName="bg-white"
          editorContentClassName="prose prose-sm px-6 py-4 min-h-[320px]"
          data-testid="tenant-doc-collab-editor"
          enableMentions
          onEditorReady={handleEditorReady}
          onChange={(doc) => onContentJsonChange?.(doc as TaskDescriptionDocument)}
          mentionOverlay={
            editorInstance && !disabled ? (
              <SceInlineMentionSuggest
                editor={editorInstance}
                searchCandidates={searchCandidates}
                testId="tenant-documentation-mention-suggest"
              />
            ) : null
          }
        />
      }
    />
  );
}

function PresenceShell({
  selfPresence,
  editor,
}: {
  selfPresence: CollaborationPresence | null;
  editor: ReactNode;
}) {
  return (
    <div className="relative">
      {editor}
      {selfPresence ? (
        <span className="sr-only" data-testid="tenant-doc-editor-presence">
          {selfPresence.displayName}
        </span>
      ) : null}
    </div>
  );
}