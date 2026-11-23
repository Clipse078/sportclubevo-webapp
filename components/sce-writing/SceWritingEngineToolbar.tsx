"use client";

import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";
import { SceWritingToolbarButton } from "@/components/sce-writing/SceWritingToolbarButton";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Code,
  Italic,
  Link2,
  List,
  ListOrdered,
  Strikethrough,
  Underline as UnderlineIcon,
} from "lucide-react";

import type { SceWritingProfileId } from "@/lib/sce-writing/sce-writing-extensions";

type Props = {
  editor: Editor;
  profile: SceWritingProfileId;
  onAddLink: () => void;
  disabled?: boolean;
};

export function SceWritingEngineToolbar({ editor, profile, onAddLink, disabled }: Props) {
  if (profile === "documentation") {
    return (
      <div
        className="flex flex-wrap items-center gap-0.5 border-b border-[var(--border)] bg-[var(--surface-2)]/80 px-2 py-1.5"
        data-testid="sce-writing-engine-toolbar"
      >
        <select
          className="h-7 rounded border border-[var(--border)] bg-[var(--surface)] px-2 text-xs"
          value={
            editor.isActive("heading", { level: 2 })
              ? "h2"
              : editor.isActive("heading", { level: 3 })
                ? "h3"
                : "p"
          }
          disabled={disabled}
          onChange={(e) => {
            if (e.target.value === "h2") {
              editor.chain().focus().toggleHeading({ level: 2 }).run();
            } else if (e.target.value === "h3") {
              editor.chain().focus().toggleHeading({ level: 3 }).run();
            } else {
              editor.chain().focus().setParagraph().run();
            }
          }}
        >
          <option value="p">Absatz</option>
          <option value="h2">Überschrift 2</option>
          <option value="h3">Überschrift 3</option>
        </select>
        <SceWritingToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          disabled={disabled}
          title="Fett (Strg+B)"
        >
          <Bold className="h-3.5 w-3.5" />
        </SceWritingToolbarButton>
        <SceWritingToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          disabled={disabled}
          title="Kursiv (Strg+I)"
        >
          <Italic className="h-3.5 w-3.5" />
        </SceWritingToolbarButton>
        <SceWritingToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          disabled={disabled}
          title="Aufzählung"
        >
          <List className="h-3.5 w-3.5" />
        </SceWritingToolbarButton>
        <SceWritingToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          disabled={disabled}
          title="Nummerierte Liste"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </SceWritingToolbarButton>
        <SceWritingToolbarButton
          onClick={onAddLink}
          active={editor.isActive("link")}
          disabled={disabled}
          title="Link (Strg+K)"
        >
          <Link2 className="h-3.5 w-3.5" />
        </SceWritingToolbarButton>
      </div>
    );
  }

  return (
    <div
      className="flex flex-wrap items-center gap-0.5 border-b border-[var(--border)] bg-[var(--surface-2)]/80 px-2 py-1.5"
      data-testid="task-description-editor-toolbar"
    >
      <SceWritingToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        disabled={disabled}
        title="Fett (Strg+B)"
      >
        <Bold className="h-3.5 w-3.5" />
      </SceWritingToolbarButton>
      <SceWritingToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        disabled={disabled}
        title="Kursiv (Strg+I)"
      >
        <Italic className="h-3.5 w-3.5" />
      </SceWritingToolbarButton>
      <SceWritingToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        disabled={disabled}
        title="Unterstrichen"
      >
        <UnderlineIcon className="h-3.5 w-3.5" />
      </SceWritingToolbarButton>
      <SceWritingToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        disabled={disabled}
        title="Durchgestrichen"
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </SceWritingToolbarButton>
      <SceWritingToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive("code")}
        disabled={disabled}
        title="Code"
      >
        <Code className="h-3.5 w-3.5" />
      </SceWritingToolbarButton>
      <SceWritingToolbarButton onClick={onAddLink} active={editor.isActive("link")} title="Link (Strg+K)">
        <Link2 className="h-3.5 w-3.5" />
      </SceWritingToolbarButton>

      <div className="mx-1 h-4 w-px bg-[var(--border)]" />

      <SceWritingToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        disabled={disabled}
        title="Aufzählung"
      >
        <List className="h-3.5 w-3.5" />
      </SceWritingToolbarButton>
      <SceWritingToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        disabled={disabled}
        title="Nummerierte Liste"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </SceWritingToolbarButton>
      <SceWritingToolbarButton
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        active={editor.isActive("taskList")}
        disabled={disabled}
        title="Checkliste"
      >
        <ProductDomainSceIcon name="tasks" size={12} />
      </SceWritingToolbarButton>
    </div>
  );
}