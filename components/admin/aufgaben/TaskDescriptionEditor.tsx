"use client";

/**
 * Reusable Task description rich-text editor (TipTap). AUFGABEN-06F2-UX1.
 */

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import { useCallback, useEffect } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  ListChecks,
  Link2,
  Code,
} from "lucide-react";
import type { TaskDescriptionDocument } from "@/lib/tasks/task-description";
import { emptyTaskDescriptionDocument } from "@/lib/tasks/task-description";

type Props = {
  value: TaskDescriptionDocument;
  onChange: (value: TaskDescriptionDocument) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeightClassName?: string;
  "data-testid"?: string;
  inputId?: string;
};

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      disabled={disabled}
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded transition
        ${active ? "bg-[var(--brand-primary,#f97316)] text-white" : "text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"}
        ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}
      `}
    >
      {children}
    </button>
  );
}

function EditorToolbar({ editor }: { editor: Editor }) {
  const addLink = useCallback(() => {
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL:", previousUrl ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  return (
    <div
      className="flex flex-wrap items-center gap-0.5 border-b border-[var(--border)] bg-[var(--surface-2)]/80 px-2 py-1.5"
      data-testid="task-description-editor-toolbar"
    >
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        title="Fett (Strg+B)"
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        title="Kursiv (Strg+I)"
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        title="Unterstrichen"
      >
        <UnderlineIcon className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        title="Durchgestrichen"
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive("code")}
        title="Code"
      >
        <Code className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={addLink} active={editor.isActive("link")} title="Link (Strg+K)">
        <Link2 className="h-3.5 w-3.5" />
      </ToolbarButton>

      <div className="mx-1 h-4 w-px bg-[var(--border)]" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        title="Aufzählung"
      >
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        title="Nummerierte Liste"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        active={editor.isActive("taskList")}
        title="Checkliste"
      >
        <ListChecks className="h-3.5 w-3.5" />
      </ToolbarButton>
    </div>
  );
}

export default function TaskDescriptionEditor({
  value,
  onChange,
  placeholder = "Aufgabe beschreiben …",
  disabled = false,
  minHeightClassName = "min-h-[12.5rem]",
  "data-testid": testId = "task-description-editor",
  inputId,
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        link: false,
        underline: false,
      }),
      Underline,
      TaskList.configure({
        HTMLAttributes: { class: "task-description-checklist" },
      }),
      TaskItem.configure({ nested: false }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value ?? emptyTaskDescriptionDocument(),
    editable: !disabled,
    editorProps: {
      attributes: {
        ...(inputId ? { id: inputId } : {}),
        class: `${minHeightClassName} outline-none`,
      },
    },
    onUpdate({ editor: ed }) {
      onChange(ed.getJSON() as TaskDescriptionDocument);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const currentJson = JSON.stringify(editor.getJSON());
    const nextJson = JSON.stringify(value ?? emptyTaskDescriptionDocument());
    if (currentJson !== nextJson) {
      editor.commands.setContent(value ?? emptyTaskDescriptionDocument());
    }
  }, [editor, value]);

  return (
    <div
      className={`overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] ${disabled ? "opacity-60" : ""}`}
      data-testid={testId}
    >
      {editor && !disabled ? <EditorToolbar editor={editor} /> : null}
      <EditorContent
        editor={editor}
        className="task-description-editor prose prose-sm max-w-none px-3 py-2 text-sm text-[var(--foreground)] focus-within:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-[var(--muted)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_ul.task-description-checklist]:list-none [&_.ProseMirror_ul.task-description-checklist]:pl-0"
      />
    </div>
  );
}
