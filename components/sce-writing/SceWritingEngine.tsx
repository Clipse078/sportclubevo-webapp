"use client";

import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { useEffect, useMemo, type ReactNode } from "react";

import { SceWritingEngineToolbar } from "@/components/sce-writing/SceWritingEngineToolbar";
import { emptyRichText, type RichTextValue } from "@/lib/cms/rich-text";
import {
  buildSceWritingEditorProps,
  SCE_WRITING_PLACEHOLDER_CONTENT_CLASS,
} from "@/lib/sce-writing/sce-writing-editor-props";
import type { Extensions } from "@tiptap/react";
import {
  buildSceWritingExtensions,
  type SceWritingProfileId,
} from "@/lib/sce-writing/sce-writing-extensions";
import { useSceWritingControlledSync } from "@/lib/sce-writing/use-sce-writing-controlled-sync";
import { useSceWritingLinkShortcut } from "@/lib/sce-writing/use-sce-writing-link-shortcut";

export type SceWritingEngineProps = {
  profile: SceWritingProfileId;
  value?: RichTextValue;
  onChange?: (value: RichTextValue) => void;
  /** Yjs / TipTap collaboration extensions (kept out of core bundle for Aufgabe vitest). */
  collaborationExtensions?: Extensions;
  collaborationMode?: boolean;
  placeholder?: string;
  disabled?: boolean;
  immediatelyRender?: boolean;
  minHeightClassName?: string;
  prosemirrorClassName?: string;
  editorContentClassName?: string;
  shellClassName?: string;
  "data-testid"?: string;
  inputId?: string;
  enableMentions?: boolean;
  mentionOverlay?: ReactNode;
  onEditorReady?: (editor: Editor | null) => void;
  hideToolbar?: boolean;
};

const DEFAULT_MIN_HEIGHT = "min-h-[12.5rem]";

export function SceWritingEngine({
  profile,
  value,
  onChange,
  collaborationExtensions,
  collaborationMode = false,
  placeholder = profile === "documentation" ? "Inhalt verfassen…" : "Aufgabe beschreiben …",
  disabled = false,
  immediatelyRender = true,
  minHeightClassName = profile === "documentation" ? "min-h-[320px]" : DEFAULT_MIN_HEIGHT,
  prosemirrorClassName,
  editorContentClassName,
  shellClassName,
  "data-testid": testId = "sce-writing-engine",
  inputId,
  enableMentions = false,
  mentionOverlay = null,
  onEditorReady,
  hideToolbar = false,
}: SceWritingEngineProps) {
  const collaborationActive = collaborationMode || Boolean(collaborationExtensions?.length);
  const resolvedProsemirrorClass =
    prosemirrorClassName ?? `${minHeightClassName} outline-none focus:outline-none`;

  const extensions = useMemo(() => {
    const base = buildSceWritingExtensions({
      profile,
      placeholder,
      enableMentions,
    });
    return collaborationExtensions?.length ? [...base, ...collaborationExtensions] : base;
  }, [profile, placeholder, enableMentions, collaborationExtensions]);

  const editor = useEditor({
    immediatelyRender,
    extensions,
    content: collaborationActive ? undefined : (value ?? emptyRichText()),
    editable: !disabled,
    editorProps: buildSceWritingEditorProps({
      prosemirrorClassName: resolvedProsemirrorClass,
      inputId,
    }),
    onUpdate: ({ editor: current }) => {
      onChange?.(current.getJSON() as RichTextValue);
    },
  });

  const addLink = useSceWritingLinkShortcut(editor, disabled);
  useSceWritingControlledSync(editor, value, collaborationActive);

  useEffect(() => {
    onEditorReady?.(editor);
    return () => onEditorReady?.(null);
  }, [editor, onEditorReady]);

  const shellWaitingForEditor = immediatelyRender === false && !editor;

  const editorContentClasses = [
    "max-w-none text-sm text-[var(--foreground)] focus-within:outline-none [&_.ProseMirror]:outline-none",
    SCE_WRITING_PLACEHOLDER_CONTENT_CLASS,
    editorContentClassName ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-[var(--border)] ${shellClassName ?? "bg-[var(--surface)]"} ${disabled ? "opacity-60" : ""}`}
      data-sce-writing-engine="true"
      data-sce-writing-profile={profile}
      data-testid={testId}
    >
      {mentionOverlay}
      {editor && !disabled && !hideToolbar ? (
        <SceWritingEngineToolbar
          editor={editor}
          profile={profile}
          onAddLink={addLink}
          disabled={disabled}
        />
      ) : null}
      {shellWaitingForEditor ? (
        <div
          className={`${editorContentClasses} px-3 py-2`}
          aria-hidden
          data-testid={`${testId}-mount-shell`}
        >
          <div className={minHeightClassName} />
        </div>
      ) : (
        <EditorContent editor={editor} className={editorContentClasses} />
      )}
    </div>
  );
}