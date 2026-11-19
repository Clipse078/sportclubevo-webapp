"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { PopoverContent } from "@/components/ui/Popover";
import { cn } from "@/lib/cn";
import { MAX_CLUB_MELDUNG_MESSAGE_BODY_LENGTH } from "@/lib/club-meldungen/constants";
import { CoordinatorAvatar } from "@/components/admin/registrations/WaitingListCoordinatorPicker";

type MentionCandidate = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
};

type MentionContext = {
  start: number;
  query: string;
};

type Props = {
  tenantSlug: string;
  meldungId: string;
  audience: "REPORTER_REPLY" | "INTERNAL_NOTE";
  disabled?: boolean;
  body: string;
  onBodyChange: (value: string) => void;
  mentionedUserIds: string[];
  onMentionedUserIdsChange: (ids: string[]) => void;
  onSubmit: () => void;
  pending?: boolean;
  error?: string | null;
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

export function ClubMeldungReplyComposer({
  tenantSlug,
  meldungId,
  audience,
  disabled = false,
  body,
  onBodyChange,
  mentionedUserIds,
  onMentionedUserIdsChange,
  onSubmit,
  pending = false,
  error,
}: Props) {
  const instanceId = useId();
  const listboxId = `meldung-mention-listbox-${instanceId}`;
  const anchorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [candidates, setCandidates] = useState<MentionCandidate[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const trimmed = body.trim();
  const canSubmit = !disabled && !pending && trimmed.length > 0;
  const internal = audience === "INTERNAL_NOTE";

  const listActiveIndex =
    candidates.length === 0 ? -1 : Math.min(Math.max(activeIndex, 0), candidates.length - 1);

  const fetchCandidates = useCallback(
    async (query: string) => {
      searchAbortRef.current?.abort();
      const controller = new AbortController();
      searchAbortRef.current = controller;
      setCandidatesLoading(true);
      try {
        const res = await fetch(
          `/api/tenants/${encodeURIComponent(tenantSlug)}/meldungen/${encodeURIComponent(meldungId)}/mention-candidates?q=${encodeURIComponent(query)}`,
          { cache: "no-store", signal: controller.signal },
        );
        const payload = await res.json();
        setCandidates(res.ok && Array.isArray(payload.candidates) ? payload.candidates : []);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        setCandidates([]);
      } finally {
        if (!controller.signal.aborted) {
          setCandidatesLoading(false);
        }
      }
    },
    [meldungId, tenantSlug],
  );

  useEffect(() => {
    if (!mentionOpen || !internal) return;
    const handle = window.setTimeout(() => {
      void fetchCandidates(mentionQuery);
    }, 180);
    return () => window.clearTimeout(handle);
  }, [fetchCandidates, internal, mentionOpen, mentionQuery]);

  useEffect(() => {
    if (!internal) {
      onMentionedUserIdsChange([]);
    }
  }, [internal, onMentionedUserIdsChange]);

  const updateMentionState = (nextBody: string, cursor: number) => {
    if (!internal) {
      setMentionOpen(false);
      return;
    }
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
    const label = user.displayName;
    const before = body.slice(0, mentionStart);
    const after = body.slice(cursor);
    const nextBody = `${before}@${label} ${after}`;
    const clipped = nextBody.slice(0, MAX_CLUB_MELDUNG_MESSAGE_BODY_LENGTH);
    onBodyChange(clipped);
    onMentionedUserIdsChange(
      mentionedUserIds.includes(user.id) ? mentionedUserIds : [...mentionedUserIds, user.id],
    );
    setMentionOpen(false);
    setMentionQuery("");
    setMentionStart(null);

    requestAnimationFrame(() => {
      const nextCursor = `${before}@${label} `.length;
      textarea?.focus();
      textarea?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const filteredCandidates = useMemo(() => candidates, [candidates]);

  const ariaLabel = internal
    ? "Interner Kommentar verfassen"
    : "Antwort an meldende Person verfassen";

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-[var(--text-2)]" id="meldung-reply-audience-label">
        {internal ? "Interner Kommentar" : "Antwort an meldende Person"}
      </p>
      <div ref={anchorRef} className="relative">
        <textarea
          ref={textareaRef}
          rows={4}
          value={body}
          onChange={(event) => {
            const nextBody = event.target.value;
            onBodyChange(nextBody);
            updateMentionState(nextBody, event.target.selectionStart);
          }}
          onClick={(event) => updateMentionState(body, event.currentTarget.selectionStart)}
          onKeyUp={(event) => updateMentionState(body, event.currentTarget.selectionStart)}
          onKeyDown={(event) => {
            if (internal && mentionOpen && filteredCandidates.length > 0) {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((prev) => Math.min(prev + 1, filteredCandidates.length - 1));
                return;
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((prev) => Math.max(prev - 1, 0));
                return;
              }
              if (event.key === "Enter" && !event.shiftKey && listActiveIndex >= 0) {
                event.preventDefault();
                insertMention(filteredCandidates[listActiveIndex]);
                return;
              }
              if (event.key === "Escape") {
                event.preventDefault();
                setMentionOpen(false);
                return;
              }
            }
          }}
          disabled={disabled || pending}
          maxLength={MAX_CLUB_MELDUNG_MESSAGE_BODY_LENGTH}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
          placeholder="Nachricht verfassen…"
          aria-label={ariaLabel}
        />
        {internal && mentionOpen ? (
          <PopoverContent
            anchorRef={anchorRef}
            open
            className="z-20 max-h-48 w-[min(100%,20rem)] overflow-y-auto p-1"
          >
            <ul id={listboxId} role="listbox" aria-label="Personen vorschlagen">
              {candidatesLoading ? (
                <li className="flex items-center gap-2 px-2 py-2 text-xs text-[var(--muted)]">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  Suche…
                </li>
              ) : filteredCandidates.length === 0 ? (
                <li className="px-2 py-2 text-xs text-[var(--muted)]">Keine Vorschläge</li>
              ) : (
                filteredCandidates.map((user, index) => (
                  <li key={user.id} role="option" aria-selected={index === listActiveIndex}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm",
                        index === listActiveIndex
                          ? "bg-[var(--surface-2)]"
                          : "hover:bg-[var(--surface-2)]",
                      )}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        insertMention(user);
                      }}
                    >
                      <CoordinatorAvatar name={user.displayName} compact />
                      <span className="text-[var(--foreground)]">{user.displayName}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </PopoverContent>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        disabled={!canSubmit}
        className="sce-button-primary rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
        onClick={onSubmit}
      >
        {pending ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Senden…
          </span>
        ) : internal ? (
          <>
            <Send className="mr-1.5 inline size-4 opacity-90" aria-hidden />
            Intern kommentieren
          </>
        ) : (
          <>
            <Send className="mr-1.5 inline size-4 opacity-90" aria-hidden />
            Antwort senden
          </>
        )}
      </button>
    </div>
  );
}