"use client";

import { useCallback, useId, useRef, useState, useTransition } from "react";
import { Loader2, Paperclip, Reply, Send, X } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import { MAX_TEAM_COMMUNICATION_BODY_LENGTH } from "@/lib/communication/team/team-communication-constants";
import type { TeamChatMentionCandidate } from "@/lib/communication/team/team-chat-mention-candidates";
import type { TeamChatReplyPreviewDto } from "@/lib/communication/team/team-chat-service";
import { searchTeamChatMentionCandidatesAction } from "@/app/(admin)/dashboard/teams/[teamId]/kommunikation/actions";

type Props = {
  teamId: string;
  disabled?: boolean;
  replyTo: TeamChatReplyPreviewDto | null;
  onClearReply: () => void;
  onSent: () => void;
  onSend: (payload: {
    bodyText: string;
    replyToCommunicationId?: string | null;
    mentionedPersonIds: string[];
    attachmentIds: string[];
  }) => Promise<{ ok: boolean; message?: string }>;
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

export function TeamChatComposer({
  teamId,
  disabled,
  replyTo,
  onClearReply,
  onSent,
  onSend,
}: Props) {
  const textareaId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState("");
  const [mentionedPersonIds, setMentionedPersonIds] = useState<string[]>([]);
  const [attachmentIds, setAttachmentIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [candidates, setCandidates] = useState<TeamChatMentionCandidate[]>([]);

  const trimmed = body.trim();
  const canSend = !disabled && !pending && (trimmed.length > 0 || attachmentIds.length > 0);

  const fetchCandidates = useCallback(
    async (query: string) => {
      const result = await searchTeamChatMentionCandidatesAction(teamId, query);
      setCandidates(result.ok ? result.options : []);
    },
    [teamId],
  );

  const applyMention = (candidate: TeamChatMentionCandidate) => {
    if (mentionStart === null) return;
    const label = candidate.label;
    const next =
      body.slice(0, mentionStart) + `@${label} ` + body.slice(textareaRef.current?.selectionStart ?? body.length);
    setBody(next);
    setMentionedPersonIds((prev) => [...new Set([...prev, candidate.personId])]);
    setMentionOpen(false);
    setMentionStart(null);
    textareaRef.current?.focus();
  };

  return (
    <div
      className="sticky bottom-0 z-10 border-t border-[var(--border)] bg-[var(--surface)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      data-testid="team-chat-composer"
    >
      {replyTo ? (
        <div
          className="mb-2 flex items-start gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs"
          data-testid="team-chat-reply-preview"
        >
          <Reply className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--text-2)]" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-[var(--foreground)]">
              Antwort auf{" "}
              {replyTo.senderPerson
                ? `${replyTo.senderPerson.firstName} ${replyTo.senderPerson.lastName}`.trim()
                : "Nachricht"}
            </p>
            <p className="truncate text-[var(--text-2)]">{replyTo.bodyText}</p>
          </div>
          <button
            type="button"
            className="rounded p-1 text-[var(--text-2)] hover:bg-[var(--surface)]"
            aria-label="Antwort abbrechen"
            onClick={onClearReply}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {mentionOpen && candidates.length > 0 ? (
        <ul
          className="mb-2 max-h-40 overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--surface)] text-sm shadow-sm"
          data-testid="team-chat-mention-list"
        >
          {candidates.map((candidate) => (
            <li key={candidate.personId}>
              <button
                type="button"
                className="flex w-full px-3 py-2 text-left hover:bg-[var(--surface-2)]"
                onClick={() => applyMention(candidate)}
              >
                @{candidate.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {attachmentIds.length > 0 ? (
        <p className="mb-2 text-xs text-[var(--text-2)]" data-testid="team-chat-attachment-count">
          {attachmentIds.length} Anhang/Anhänge ausgewählt
        </p>
      ) : null}

      {error ? (
        <p className="mb-2 text-sm text-red-600" role="alert" data-testid="team-chat-composer-error">
          {error}
        </p>
      ) : null}

      <div className="flex items-end gap-2">
        <label htmlFor={textareaId} className="sr-only">
          Team-Nachricht
        </label>
        <textarea
          ref={textareaRef}
          id={textareaId}
          value={body}
          rows={2}
          maxLength={MAX_TEAM_COMMUNICATION_BODY_LENGTH}
          disabled={disabled || pending}
          placeholder="Nachricht an das Team…"
          className={cn(
            "min-h-[2.75rem] flex-1 resize-none rounded-xl border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 py-2 text-sm",
            "focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30",
          )}
          data-testid="team-chat-composer-input"
          onChange={(event) => {
            const value = event.target.value;
            setBody(value);
            const ctx = detectMentionContext(value, event.target.selectionStart ?? value.length);
            if (ctx) {
              setMentionStart(ctx.start);
              setMentionOpen(true);
              void fetchCandidates(ctx.query);
            } else {
              setMentionOpen(false);
              setMentionStart(null);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (!canSend) return;
              const sendButton = event.currentTarget.parentElement?.querySelector(
                "[data-testid='team-chat-send-button']",
              ) as HTMLButtonElement | null;
              sendButton?.click();
            }
          }}
        />
        <input
          type="hidden"
          name="attachmentIds"
          value={attachmentIds.join(",")}
          readOnly
        />
        <Button
          type="button"
          variant="secondary"
          size="icon"
          disabled={disabled || pending}
          aria-label="Anhang (Referenz)"
          data-testid="team-chat-attachment-button"
          onClick={() => {
            const id = window.prompt("Communication-Attachment-ID (Workspace-Referenz):");
            if (!id?.trim()) return;
            setAttachmentIds((prev) => [...new Set([...prev, id.trim()])]);
          }}
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Button
          type="submit"
          disabled={!canSend}
          data-testid="team-chat-send-button"
          onClick={() => {
            startTransition(async () => {
              setError(null);
              const result = await onSend({
                bodyText: body,
                replyToCommunicationId: replyTo?.communicationId ?? null,
                mentionedPersonIds,
                attachmentIds,
              });
              if (result.ok) {
                setBody("");
                setMentionedPersonIds([]);
                setAttachmentIds([]);
                onSent();
              } else {
                setError(result.message ?? "Senden fehlgeschlagen.");
              }
            });
          }}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          <span className="sr-only">Senden</span>
        </Button>
      </div>
    </div>
  );
}
