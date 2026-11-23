"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";

import { cn } from "@/lib/cn";
import type { SceWritingProfileId } from "@/lib/sce-writing/sce-writing-extensions";
import {
  listSceWritingInsertMenuItems,
  type SceWritingInsertMenuItem,
} from "@/lib/sce-writing/sce-writing-insert-menu-items";

type SlashContext = {
  from: number;
  to: number;
  query: string;
};

type Props = {
  editor: Editor;
  profile: SceWritingProfileId;
  disabled?: boolean;
};

function detectSlashContext(editor: Editor): SlashContext | null {
  const { state } = editor;
  const { $from } = state.selection;
  if (!$from.parent.isTextblock) return null;
  const blockStart = $from.start();
  const textBefore = state.doc.textBetween(blockStart, $from.pos, "\n", "\ufffc");
  const slashIndex = textBefore.lastIndexOf("/");
  if (slashIndex < 0) return null;
  const charBefore = slashIndex > 0 ? textBefore[slashIndex - 1]! : "";
  if (charBefore && charBefore !== " " && charBefore !== "\n") return null;
  const query = textBefore.slice(slashIndex + 1);
  if (query.includes(" ") || query.includes("\n")) return null;
  const from = blockStart + slashIndex;
  return { from, to: $from.pos, query };
}

export function SceWritingInsertMenu({ editor, profile, disabled }: Props) {
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<{ from: number; to: number } | null>(null);
  const [items, setItems] = useState<SceWritingInsertMenuItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const itemsRef = useRef(items);
  const activeIndexRef = useRef(activeIndex);
  itemsRef.current = items;
  activeIndexRef.current = activeIndex;

  const reset = useCallback(() => {
    setOpen(false);
    setQuery("");
    setRange(null);
    setItems([]);
    setActiveIndex(0);
  }, []);

  const applyItem = useCallback(
    (item: SceWritingInsertMenuItem) => {
      if (!range) return;
      editor.chain().focus().deleteRange(range).run();
      item.run(editor);
      reset();
    },
    [editor, range, reset],
  );

  useEffect(() => {
    if (!editor || disabled) {
      reset();
      return;
    }

    const refresh = () => {
      const ctx = detectSlashContext(editor);
      if (!ctx) {
        reset();
        return;
      }
      const nextItems = listSceWritingInsertMenuItems(profile, ctx.query);
      setQuery(ctx.query);
      setRange({ from: ctx.from, to: ctx.to });
      setItems(nextItems);
      setActiveIndex(0);
      setOpen(true);
    };

    editor.on("transaction", refresh);
    editor.on("update", refresh);
    return () => {
      editor.off("transaction", refresh);
      editor.off("update", refresh);
    };
  }, [editor, profile, disabled, reset]);

  useEffect(() => {
    if (!editor || disabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!open) return;
      const menuItems = itemsRef.current;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        reset();
        return;
      }
      if (menuItems.length === 0) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        setActiveIndex((index) => (index + 1) % menuItems.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        setActiveIndex((index) => (index - 1 + menuItems.length) % menuItems.length);
      } else if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        event.stopPropagation();
        applyItem(menuItems[activeIndexRef.current]!);
      }
    };
    // Capture phase so TipTap keymaps cannot consume Enter/arrow keys while the menu is open.
    editor.view.dom.addEventListener("keydown", onKeyDown, true);
    return () => editor.view.dom.removeEventListener("keydown", onKeyDown, true);
  }, [editor, open, applyItem, reset, disabled]);

  if (!open) return null;

  return (
    <div
      className="absolute left-2 top-full z-30 mt-1 w-64 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg"
      data-testid="sce-writing-insert-menu"
      data-sce-writing-insert-query={query}
    >
      <p className="border-b border-[var(--border)] px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
        Block einfügen
      </p>
      <ul id={listboxId} role="listbox" className="max-h-52 overflow-y-auto py-1">
        {items.length === 0 ? (
          <li className="px-3 py-2 text-xs text-[var(--muted)]">Keine Blöcke</li>
        ) : (
          items.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                data-sce-writing-insert-item={item.id}
                className={cn(
                  "w-full px-3 py-1.5 text-left text-sm",
                  index === activeIndex
                    ? "bg-[color-mix(in_srgb,var(--sce-primary)_12%,transparent)] text-[var(--foreground)]"
                    : "text-[var(--text-2)] hover:bg-[var(--surface-2)]",
                )}
                onMouseDown={(event) => {
                  event.preventDefault();
                  applyItem(item);
                }}
              >
                {item.title}
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}