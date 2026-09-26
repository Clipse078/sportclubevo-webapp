"use client";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { PopoverContent } from "@/components/ui/Popover";
import { cn } from "@/lib/cn";
import { MAX_TASK_COMMENT_BODY_LENGTH } from "@/lib/tasks/constants";
import { CoordinatorAvatar } from "@/components/admin/registrations/WaitingListCoordinatorPicker";
import { searchTaskMentionCandidatesAction } from "@/app/(admin)/dashboard/aufgaben/actions";

type MentionCandidate = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
};

type MentionContext = {
  start: number;
  query: string;
};

type Props = {
  taskId: string;
  disabled?: boolean;
  placeholder?: string;
  initialBody?: string;
  initialMentionedUserIds?: string[];
  submitLabel?: string;
  onSubmit: (payload: { body: string; mentionedUserIds: string[] }) => Promise<void>;
  onCancel?: () => void;
};

function detectMentionContext(text: string, cursor: number): MentionContext | null {
  const beforeCursor = text.slice(0, cursor);
  const atIndex = beforeCursor.lastIndexOf("@");
  if (atIndex < 0) return null;

  const charBeforeAt = atIndex > 0 ? beforeCursor[atIndex - 1] : " ";
  if (charBeforeAt !== " " && charBeforeAt !== "\n" && atIndex !== 0) {
    return null;
  }

  const query = beforeCursor.slice(atIndex + 1);
  if (query.includes("\n")) return null;

  return { start: atIndex, query };
}

export function TaskCommentComposer({
  taskId,
  disabled = false,
  placeholder = "Kommentar schreiben…",
  initialBody = "",
  initialMentionedUserIds = [],
  submitLabel = "Senden",
  onSubmit,
  onCancel,
}: Props) {
  const instanceId = useId();
  const listboxId = `task-mention-listbox-${instanceId}`;
  const anchorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [body, setBody] = useState(initialBody);
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>(initialMentionedUserIds);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [candidates, setCandidates] = useState<MentionCandidate[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const trimmed = body.trim();
  const canSubmit = !disabled && !submitting && trimmed.length > 0;

  const listActiveIndex =
    candidates.length === 0 ? -1 : Math.min(Math.max(activeIndex, 0), candidates.length - 1);

  const fetchCandidates = useCallback(
    async (query: string) => {
      setCandidatesLoading(true);
      try {
        const result = await searchTaskMentionCandidatesAction(taskId, query);
        if (result.ok) {
          setCandidates(result.options);
        } else {
          setCandidates([]);
        }
      } catch {
        setCandidates([]);
      } finally {
        setCandidatesLoading(false);
      }
    },
    [taskId],
  );

  useEffect(() => {
    if (!mentionOpen) return;
    const handle = window.setTimeout(() => {
      void fetchCandidates(mentionQuery);
    }, 180);
    return () => window.clearTimeout(handle);
  }, [fetchCandidates, mentionOpen, mentionQuery]);

  const updateMentionState = (nextBody: string, cursor: number) => {
    const context = detectMentionContext(nextBody, cursor);
    if (!context) {
      setMentionOpen(false);
      setMentionQuery("");
      setMentionStart(null);
      return;
    }
    setMentionOpen(true);
    setMentionQuery(context.query);
    setMentionStart(context.start);
    setActiveIndex(0);
  };

  const insertMention = (user: MentionCandidate) => {
    if (mentionStart === null) return;
    const textarea = textareaRef.current;
    const cursor = textarea?.selectionStart ?? body.length;
    const label = `${user.firstName} ${user.lastName}`.trim();
    const before = body.slice(0, mentionStart);
    const after = body.slice(cursor);
    const nextBody = `${before}@${label} ${after}`;
    setBody(nextBody.slice(0, MAX_TASK_COMMENT_BODY_LENGTH));
    setMentionedUserIds((prev) => (prev.includes(user.userId) ? prev : [...prev, user.userId]));
    setMentionOpen(false);
    setMentionQuery("");
    setMentionStart(null);

    requestAnimationFrame(() => {
      const nextCursor = `${before}@${label} `.length;
      textarea?.focus();
      textarea?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ body: trimmed, mentionedUserIds });
      if (!onCancel) {
        setBody("");
        setMentionedUserIds([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kommentar konnte nicht gespeichert werden.");
    } finally {
      setSubmitting(false);
    }
  }

  const filteredCandidates = useMemo(() => candidates, [candidates]);

  return (
    <div className="space-y-2" data-testid="task-comment-composer">
      <div ref={anchorRef} className="relative">
        <textarea
          ref={textareaRef}
          className="fca-input min-h-[4.5rem] w-full resize-y text-sm"
          placeholder={placeholder}
          value={body}
          maxLength={MAX_TASK_COMMENT_BODY_LENGTH}
          disabled={disabled || submitting}
          onChange={(e) => {
            setBody(e.target.value);
            updateMentionState(e.target.value, e.target.selectionStart);
          }}
          onClick={(e) => updateMentionState(body, e.currentTarget.selectionStart)}
          onKeyUp={(e) => updateMentionState(body, e.currentTarget.selectionStart)}
          onKeyDown={(e) => {
            if (mentionOpen && filteredCandidates.length > 0) {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((prev) => Math.min(prev + 1, filteredCandidates.length - 1));
                return;
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((prev) => Math.max(prev - 1, 0));
                return;
              }
              if (e.key === "Enter" && !e.shiftKey && listActiveIndex >= 0) {
                e.preventDefault();
                insertMention(filteredCandidates[listActiveIndex]!);
                return;
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setMentionOpen(false);
                return;
              }
            }
          }}
          data-testid="task-comment-composer-input"
        />

        <PopoverContent
          open={mentionOpen && (filteredCandidates.length > 0 || candidatesLoading)}
          onOpenChange={setMentionOpen}
          anchorRef={anchorRef}
          id={listboxId}
          matchAnchorWidth={false}
          maxHeight={240}
          className="min-w-[260px]"
        >
          {candidatesLoading ? (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--muted)]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Suche…
            </div>
          ) : (
            <ul role="listbox" aria-label="Erwähnungen" className="py-0">
              {filteredCandidates.map((user, index) => {
                const label = `${user.firstName} ${user.lastName}`.trim();
                return (
                  <li key={user.userId} role="option" aria-selected={index === listActiveIndex}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-[var(--surface-2)]",
                        index === listActiveIndex && "bg-[var(--surface-2)]",
                      )}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        insertMention(user);
                      }}
                    >
                      <CoordinatorAvatar name={label} compact />
                      <span className="min-w-0 truncate font-medium">{label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </PopoverContent>
      </div>

      {error ? (
        <p className="text-xs text-red-600" data-testid="task-comment-composer-error">
          {error}
        </p>
      ) : null}
      <div className="flex items-center justify-end gap-2">
        {onCancel ? (
          <button
            type="button"
            className="rounded-md px-3 py-1.5 text-xs font-medium text-[var(--muted)] hover:bg-[var(--surface-2)]"
            onClick={onCancel}
            disabled={submitting}
          >
            Abbrechen
          </button>
        ) : null}
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white",
            !canSubmit && "opacity-50",
          )}
          disabled={!canSubmit}
          onClick={() => void handleSubmit()}
          data-testid="task-comment-composer-submit"
        >
          {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
          <ProductDomainSceIcon name="publish" size={12} className="h-3.5 w-3.5" />
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
