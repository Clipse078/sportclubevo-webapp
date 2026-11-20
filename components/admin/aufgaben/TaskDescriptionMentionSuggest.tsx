"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  searchTaskMentionCandidatesAction,
  searchTenantDescriptionMentionCandidatesAction,
} from "@/app/(admin)/dashboard/aufgaben/actions";

type MentionCandidate = {
  userId: string;
  displayName: string;
  firstName: string;
  lastName: string;
};

type MentionScope = "tenant" | "task";

type Props = {
  editor: Editor | null;
  scope: MentionScope;
  taskId?: string | null;
};

function detectMentionContext(text: string, cursor: number): { start: number; query: string } | null {
  const beforeCursor = text.slice(0, cursor);
  const atIndex = beforeCursor.lastIndexOf("@");
  if (atIndex < 0) return null;
  const charBeforeAt = atIndex > 0 ? beforeCursor[atIndex - 1] : " ";
  if (charBeforeAt !== " " && charBeforeAt !== "\n" && atIndex !== 0) return null;
  const query = beforeCursor.slice(atIndex + 1);
  if (query.includes("\n")) return null;
  return { start: atIndex, query };
}

export default function TaskDescriptionMentionSuggest({ editor, scope, taskId = null }: Props) {
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [candidates, setCandidates] = useState<MentionCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    setOpen(false);
    setQuery("");
    setMentionStart(null);
    setCandidates([]);
    setActiveIndex(0);
  }, []);

  const insertMention = useCallback(
    (candidate: MentionCandidate) => {
      if (!editor || mentionStart == null) return;
      const { state } = editor;
      const cursor = state.selection.from;
      const label = candidate.displayName.trim() || `${candidate.firstName} ${candidate.lastName}`.trim();
      editor
        .chain()
        .focus()
        .deleteRange({ from: mentionStart, to: cursor })
        .insertContent({
          type: "text",
          text: `@${label}`,
          marks: [
            {
              type: "taskDescriptionMention",
              attrs: { userId: candidate.userId, label },
            },
          ],
        })
        .insertContent(" ")
        .run();
      reset();
    },
    [editor, mentionStart, reset],
  );

  useEffect(() => {
    if (!editor) return;

    const onTransaction = () => {
      const { from } = editor.state.selection;
      const textBefore = editor.state.doc.textBetween(0, from, "\n");
      const ctx = detectMentionContext(textBefore, textBefore.length);
      if (!ctx) {
        reset();
        return;
      }
      setMentionStart(ctx.start);
      setQuery(ctx.query);
      setOpen(true);
    };

    editor.on("transaction", onTransaction);
    return () => {
      editor.off("transaction", onTransaction);
    };
  }, [editor, reset]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const result =
          scope === "task" && taskId?.trim()
            ? await searchTaskMentionCandidatesAction(taskId.trim(), query)
            : await searchTenantDescriptionMentionCandidatesAction(query);
        if (result.ok) {
          setCandidates(
            result.options.map((row) => ({
              userId: row.userId,
              displayName: row.displayName,
              firstName: row.firstName,
              lastName: row.lastName,
            })),
          );
          setActiveIndex(0);
        } else {
          setCandidates([]);
        }
      } finally {
        setLoading(false);
      }
    }, 160);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, query, scope, taskId]);

  useEffect(() => {
    if (!editor || !open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!open || candidates.length === 0) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((i) => (i + 1) % candidates.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((i) => (i - 1 + candidates.length) % candidates.length);
      } else if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        insertMention(candidates[activeIndex]!);
      } else if (event.key === "Escape") {
        event.preventDefault();
        reset();
      }
    };
    editor.view.dom.addEventListener("keydown", onKeyDown);
    return () => editor.view.dom.removeEventListener("keydown", onKeyDown);
  }, [editor, open, candidates, activeIndex, insertMention, reset]);

  if (!open) return null;

  return (
    <div
      className="absolute left-2 top-full z-20 mt-1 w-64 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg"
      data-testid="task-description-mention-suggest"
    >
      <ul id={listboxId} role="listbox" className="max-h-48 overflow-y-auto py-1">
        {loading ? (
          <li className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--muted)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Suche…
          </li>
        ) : candidates.length === 0 ? (
          <li className="px-3 py-2 text-xs text-[var(--muted)]">Keine Treffer</li>
        ) : (
          candidates.map((candidate, index) => {
            const label =
              candidate.displayName.trim() || `${candidate.firstName} ${candidate.lastName}`.trim();
            return (
              <li key={candidate.userId}>
                <button
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  className={cn(
                    "w-full px-3 py-1.5 text-left text-sm",
                    index === activeIndex
                      ? "bg-[color-mix(in_srgb,var(--sce-primary)_12%,transparent)] text-[var(--foreground)]"
                      : "text-[var(--text-2)] hover:bg-[var(--surface-2)]",
                  )}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    insertMention(candidate);
                  }}
                >
                  @{label}
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}