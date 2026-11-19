"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { PopoverContent } from "@/components/ui/Popover";
import { cn } from "@/lib/cn";
import { MAX_CLUB_MELDUNG_MESSAGE_BODY_LENGTH } from "@/lib/club-meldungen/constants";
import {
  SCE_MELDUNG_LIGHT_PICKER_MUTED_TEXT,
  sceMeldungLightPickerOptionClass,
} from "@/lib/club-meldungen/meldung-picker-surface";
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

type MentionPanelState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "results"; candidates: MentionCandidate[] }
  | { kind: "empty" }
  | { kind: "unavailable"; message: string }
  | { kind: "error"; message: string };

const MENTION_UNAVAILABLE_COPY = "Erwähnungen derzeit nicht verfügbar";
const MENTION_NO_MATCH_COPY = "Keine berechtigte Person gefunden";
const MENTION_DENIED_COPY = "Keine Berechtigung für Erwähnungen";
const MENTION_ERROR_COPY = "Erwähnungen konnten nicht geladen werden";

type Props = {
  tenantSlug: string;
  meldungId: string;
  audience: "REPORTER_REPLY" | "INTERNAL_NOTE";
  mentionsEnabled?: boolean;
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
  mentionsEnabled = true,
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
  const [panelState, setPanelState] = useState<MentionPanelState>({ kind: "idle" });
  const [activeIndex, setActiveIndex] = useState(0);

  const trimmed = body.trim();
  const canSubmit = !disabled && !pending && trimmed.length > 0;
  const internal = audience === "INTERNAL_NOTE";
  const mentionFeatureActive = internal && mentionsEnabled;

  const candidates =
    panelState.kind === "results" ? panelState.candidates : [];

  const listActiveIndex =
    candidates.length === 0 ? -1 : Math.min(Math.max(activeIndex, 0), candidates.length - 1);

  const fetchCandidates = useCallback(
    async (query: string) => {
      if (!mentionsEnabled) {
        setPanelState({
          kind: "unavailable",
          message: MENTION_UNAVAILABLE_COPY,
        });
        return;
      }

      searchAbortRef.current?.abort();
      const controller = new AbortController();
      searchAbortRef.current = controller;
      setPanelState({ kind: "loading" });
      try {
        const res = await fetch(
          `/api/tenants/${encodeURIComponent(tenantSlug)}/meldungen/${encodeURIComponent(meldungId)}/mention-candidates?q=${encodeURIComponent(query)}`,
          { cache: "no-store", signal: controller.signal },
        );
        let payload: { candidates?: MentionCandidate[]; code?: string; error?: string } = {};
        try {
          payload = await res.json();
        } catch {
          payload = {};
        }

        if (!res.ok) {
          if (res.status === 503 || payload.code === "SCHEMA_UNAVAILABLE") {
            setPanelState({ kind: "unavailable", message: MENTION_UNAVAILABLE_COPY });
          } else if (res.status === 401 || res.status === 403) {
            setPanelState({ kind: "unavailable", message: MENTION_DENIED_COPY });
          } else {
            setPanelState({ kind: "error", message: MENTION_ERROR_COPY });
          }
          return;
        }

        const next = Array.isArray(payload.candidates) ? payload.candidates : [];
        if (next.length === 0) {
          setPanelState({ kind: "empty" });
        } else {
          setPanelState({ kind: "results", candidates: next });
        }
      } catch (fetchError) {
        if (fetchError instanceof Error && fetchError.name === "AbortError") return;
        setPanelState({ kind: "error", message: MENTION_ERROR_COPY });
      }
    },
    [meldungId, mentionsEnabled, tenantSlug],
  );

  useEffect(() => {
    if (!mentionOpen || !mentionFeatureActive) return;
    const handle = window.setTimeout(() => {
      void fetchCandidates(mentionQuery);
    }, 180);
    return () => window.clearTimeout(handle);
  }, [fetchCandidates, mentionFeatureActive, mentionOpen, mentionQuery]);

  useEffect(() => {
    if (!internal) {
      onMentionedUserIdsChange([]);
    }
  }, [internal, onMentionedUserIdsChange]);

  const updateMentionState = (nextBody: string, cursor: number) => {
    const context = detectMentionContext(nextBody, cursor);
    if (!mentionFeatureActive) {
      if (internal && !mentionsEnabled && context) {
        setMentionOpen(true);
        setMentionQuery(context.query);
        setMentionStart(context.start);
        setPanelState({ kind: "unavailable", message: MENTION_UNAVAILABLE_COPY });
      } else {
        setMentionOpen(false);
        setMentionQuery("");
        setMentionStart(null);
        setPanelState({ kind: "idle" });
      }
      return;
    }
    if (!context) {
      setMentionOpen(false);
      setMentionQuery("");
      setMentionStart(null);
      setPanelState({ kind: "idle" });
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
    setPanelState({ kind: "idle" });

    requestAnimationFrame(() => {
      const nextCursor = `${before}@${label} `.length;
      textarea?.focus();
      textarea?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const ariaLabel = internal
    ? "Interner Kommentar verfassen"
    : "Antwort an meldende Person verfassen";

  const showMentionPanel = internal && mentionOpen;
  const panelMessage = useMemo(() => {
    if (panelState.kind === "loading") return null;
    if (panelState.kind === "empty") return MENTION_NO_MATCH_COPY;
    if (panelState.kind === "unavailable" || panelState.kind === "error") {
      return panelState.message;
    }
    return null;
  }, [panelState]);

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
            if (mentionFeatureActive && mentionOpen && candidates.length > 0) {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((prev) => Math.min(prev + 1, candidates.length - 1));
                return;
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((prev) => Math.max(prev - 1, 0));
                return;
              }
              if (event.key === "Enter" && !event.shiftKey && listActiveIndex >= 0) {
                event.preventDefault();
                insertMention(candidates[listActiveIndex]);
                return;
              }
            }
            if (event.key === "Escape" && mentionOpen) {
              event.preventDefault();
              setMentionOpen(false);
              setPanelState({ kind: "idle" });
            }
          }}
          disabled={disabled || pending}
          maxLength={MAX_CLUB_MELDUNG_MESSAGE_BODY_LENGTH}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
          placeholder="Nachricht verfassen…"
          aria-label={ariaLabel}
        />
        {showMentionPanel ? (
          <PopoverContent
            anchorRef={anchorRef}
            open
            onOpenChange={setMentionOpen}
            surfaceVariant="sce-light"
            matchAnchorWidth={false}
            className="z-20 max-h-48 w-[min(100%,20rem)] p-1"
          >
            <ul id={listboxId} role="listbox" aria-label="Personen vorschlagen">
              {panelState.kind === "loading" ? (
                <li className="flex items-center gap-2 px-2 py-2 text-xs text-slate-600">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  Suche…
                </li>
              ) : panelMessage ? (
                <li
                  className={cn("px-2 py-2 text-xs", SCE_MELDUNG_LIGHT_PICKER_MUTED_TEXT)}
                  role="status"
                >
                  {panelMessage}
                </li>
              ) : (
                candidates.map((user, index) => (
                  <li key={user.id} role="option" aria-selected={index === listActiveIndex}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-900",
                        sceMeldungLightPickerOptionClass(index === listActiveIndex),
                      )}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        insertMention(user);
                      }}
                    >
                      <CoordinatorAvatar name={user.displayName} compact />
                      <span>{user.displayName}</span>
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

export {
  detectMentionContext,
  MENTION_DENIED_COPY,
  MENTION_ERROR_COPY,
  MENTION_NO_MATCH_COPY,
  MENTION_UNAVAILABLE_COPY,
};