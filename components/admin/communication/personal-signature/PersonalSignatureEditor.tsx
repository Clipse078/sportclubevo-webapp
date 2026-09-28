"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useCallback, useEffect, useRef } from "react";
import type { PersonalSignatureContent } from "@/lib/communication/personal-signature/signature-content-types";
import { SignatureImageExtension } from "@/lib/communication/personal-signature/signature-image-tiptap-extension";
import { isAllowedSignatureLinkHref } from "@/lib/communication/personal-signature/signature-link-validation";

type Props = {
  value: PersonalSignatureContent | null;
  onChange: (value: PersonalSignatureContent) => void;
  disabled?: boolean;
  inputId?: string;
};

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(event) => {
        event.preventDefault();
        onClick();
      }}
      disabled={disabled}
      className={`flex h-8 min-w-8 items-center justify-center rounded px-2 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]
        ${active ? "bg-[var(--sce-primary)] text-white" : "text-[var(--text-2)] hover:bg-[var(--surface-2)]"}
        ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
    >
      {children}
    </button>
  );
}

function EditorToolbar({
  editor,
  onInsertImage,
  busy,
}: {
  editor: Editor;
  onInsertImage: () => void;
  busy: boolean;
}) {
  const addLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const href = window.prompt("Link-URL (https://, mailto:, tel:)", previous ?? "https://");
    if (href === null) return;
    if (!href.trim()) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    if (!isAllowedSignatureLinkHref(href)) {
      window.alert("Dieser Link ist aus Sicherheitsgründen nicht erlaubt.");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: href.trim(), target: "_blank" }).run();
  };

  return (
    <div
      className="flex flex-wrap gap-1 border-b border-[var(--border)] bg-[var(--surface-2)]/60 px-2 py-2"
      role="toolbar"
      aria-label="Signatur formatieren"
    >
      <ToolbarButton
        label="Fett"
        active={editor.isActive("bold")}
        disabled={busy}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        B
      </ToolbarButton>
      <ToolbarButton
        label="Kursiv"
        active={editor.isActive("italic")}
        disabled={busy}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        I
      </ToolbarButton>
      <ToolbarButton label="Link einfügen" disabled={busy} onClick={addLink}>
        Link
      </ToolbarButton>
      <ToolbarButton label="Logo / Bild einfügen" disabled={busy} onClick={onInsertImage}>
        Logo
      </ToolbarButton>
      <ToolbarButton
        label="Trennlinie"
        disabled={busy}
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        —
      </ToolbarButton>
      <ToolbarButton
        label="Formatierung entfernen"
        disabled={busy}
        onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
      >
        Reset
      </ToolbarButton>
    </div>
  );
}

export function PersonalSignatureEditor({ value, onChange, disabled, inputId }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadBusyRef = useRef(false);

  const editor = useEditor({
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
        code: false,
      }),
      Link.configure({ openOnClick: false, autolink: false }),
      Placeholder.configure({
        placeholder:
          "Freundliche Grüsse\nMax Mustermann\nTrainer F2\nFC Allschwil",
      }),
      SignatureImageExtension,
    ],
    content: value ?? { type: "doc", version: 1, content: [{ type: "paragraph" }] },
    onUpdate: ({ editor: ed }) => {
      const json = ed.getJSON();
      onChange({
        type: "doc",
        version: 1,
        content: (json.content ?? []) as PersonalSignatureContent["content"],
      });
    },
    editorProps: {
      attributes: {
        ...(inputId ? { id: inputId } : {}),
        class:
          "prose prose-sm max-w-none px-3 py-2 text-sm min-h-[120px] focus:outline-none",
        "aria-label": "Signatur bearbeiten",
      },
    },
  });

  useEffect(() => {
    if (!editor || !value) return;
    const current = JSON.stringify(editor.getJSON().content);
    const next = JSON.stringify(value.content);
    if (current !== next) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  const uploadImage = useCallback(async () => {
    if (!editor || uploadBusyRef.current) return;
    fileInputRef.current?.click();
  }, [editor]);

  const onFileSelected = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file || !editor) return;
      uploadBusyRef.current = true;
      try {
        const altDefault = file.name.replace(/\.[^.]+$/, "").slice(0, 80);
        const altText =
          window.prompt("Alt-Text für das Logo (Barrierefreiheit)", altDefault)?.trim() ||
          altDefault ||
          "Logo";
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/communication/personal-signature/image", {
          method: "POST",
          body: form,
        });
        const data = (await res.json()) as {
          attachmentId?: string;
          cidKey?: string;
          message?: string;
          error?: string;
        };
        if (!res.ok || !data.attachmentId) {
          window.alert(data.message ?? data.error ?? "Logo-Upload fehlgeschlagen.");
          return;
        }
        editor
          .chain()
          .focus()
          .insertSignatureImage({
            attachmentId: data.attachmentId,
            altText,
            cidKey: data.cidKey ?? data.attachmentId,
          })
          .run();
      } finally {
        uploadBusyRef.current = false;
      }
    },
    [editor],
  );

  if (!editor) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)]">
      <EditorToolbar editor={editor} onInsertImage={() => void uploadImage()} busy={Boolean(disabled)} />
      <EditorContent editor={editor} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => void onFileSelected(event)}
      />
    </div>
  );
}
