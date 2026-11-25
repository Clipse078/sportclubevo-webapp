"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import SceClubDevelopmentSectionShell from "@/components/admin/club-development/SceClubDevelopmentSectionShell";
import { SCE_CD_WORKSPACE_PANEL_CLASS } from "@/components/admin/club-development/sce-club-development-surface-styles";
import {
  CLUB_MELDUNG_CATEGORY_LABELS,
  CLUB_MELDUNG_STATUS_LABELS,
} from "@/lib/club-meldungen/copy";
import type { ClubMeldungCategory, ClubMeldungStatus } from "@prisma/client";
import { cn } from "@/lib/cn";
import SceRecordPublicReferenceDetail from "@/components/admin/shared/SceRecordPublicReferenceDetail";

type Message = {
  id: string;
  body: string;
  audience: "REPORTER_REPLY" | "INTERNAL_NOTE";
  createdAt: string;
  author: { firstName: string; lastName: string };
};

type Attachment = {
  id: string;
  originalFilename: string;
};

type Props = {
  tenantSlug: string;
  meldungId: string;
  mode: "reporter" | "internal";
  caseNumber: string;
  publicReference?: string | null;
  subject: string;
  description: string;
  category: ClubMeldungCategory;
  status: ClubMeldungStatus;
  messages: Message[];
  attachments?: Attachment[];
  createdBanner?: boolean;
};

export default function ClubMeldungDetailPanel({
  tenantSlug,
  meldungId,
  mode,
  caseNumber,
  publicReference,
  subject,
  description,
  category,
  status,
  messages,
  attachments = [],
  createdBanner,
}: Props) {
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const visibleMessages = messages.filter(
    (message) => mode !== "reporter" || message.audience === "REPORTER_REPLY",
  );

  function sendMessage() {
    setError(null);
    startTransition(async () => {
      const response = await fetch(
        `/api/tenants/${tenantSlug}/meldungen/${meldungId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            body: reply,
            audience: "REPORTER_REPLY",
            asReporter: mode === "reporter",
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error ?? "Senden fehlgeschlagen");
        return;
      }
      setReply("");
      window.location.reload();
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6" data-testid="club-meldung-detail">
      {createdBanner ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Meldung {caseNumber} wurde aufgenommen. Der Verein bearbeitet sie so bald wie möglich.
        </p>
      ) : null}

      <header className={cn(SCE_CD_WORKSPACE_PANEL_CLASS, "space-y-2")}>
        <SceRecordPublicReferenceDetail
          reference={publicReference ?? caseNumber}
          testId="meldung-reporter-detail-public-reference"
        />
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">{subject}</h1>
        <p className="text-sm text-[var(--text-2)]">
          {CLUB_MELDUNG_CATEGORY_LABELS[category]} · {CLUB_MELDUNG_STATUS_LABELS[status]}
        </p>
      </header>

      <SceClubDevelopmentSectionShell title="Deine Meldung">
        <p className="whitespace-pre-wrap text-sm text-[var(--foreground)]">{description}</p>
        {attachments.length > 0 ? (
          <ul className="mt-4 space-y-2 border-t border-[var(--border)] pt-4">
            {attachments.map((attachment) => (
              <li key={attachment.id}>
                <Link
                  href={`/api/tenants/${tenantSlug}/meldungen/attachments/${attachment.id}/download`}
                  className="text-sm text-[var(--sce-primary)] hover:underline"
                >
                  {attachment.originalFilename}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </SceClubDevelopmentSectionShell>

      <SceClubDevelopmentSectionShell title="Verlauf">
        <ul className="space-y-3" aria-label="Verlauf">
          {visibleMessages.length === 0 ? (
            <li className="text-sm text-[var(--muted)]">Noch keine Nachrichten.</li>
          ) : (
            visibleMessages.map((message) => (
              <li
                key={message.id}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              >
                <p className="text-xs text-[var(--muted)]">
                  {message.author.firstName} {message.author.lastName} ·{" "}
                  {new Date(message.createdAt).toLocaleString("de-CH")}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-[var(--foreground)]">{message.body}</p>
              </li>
            ))
          )}
        </ul>
      </SceClubDevelopmentSectionShell>

      <SceClubDevelopmentSectionShell title="Nachricht">
        <textarea
          rows={4}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
          placeholder={mode === "reporter" ? "Rückfrage oder Ergänzung…" : "Nachricht verfassen…"}
          disabled={pending}
        />
        {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
        <button
          type="button"
          disabled={pending || !reply.trim()}
          className="sce-button-primary mt-3 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
          onClick={sendMessage}
        >
          Senden
        </button>
      </SceClubDevelopmentSectionShell>
    </div>
  );
}