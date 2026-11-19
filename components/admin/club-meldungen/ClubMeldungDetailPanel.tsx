"use client";

import { useState, useTransition } from "react";
import {
  CLUB_MELDUNG_CATEGORY_LABELS,
  CLUB_MELDUNG_STATUS_LABELS,
} from "@/lib/club-meldungen/copy";
import type { ClubMeldungCategory, ClubMeldungStatus } from "@prisma/client";

type Message = {
  id: string;
  body: string;
  audience: "REPORTER_REPLY" | "INTERNAL_NOTE";
  createdAt: string;
  author: { firstName: string; lastName: string };
};

type Props = {
  tenantSlug: string;
  meldungId: string;
  mode: "reporter" | "internal";
  caseNumber: string;
  subject: string;
  description: string;
  category: ClubMeldungCategory;
  status: ClubMeldungStatus;
  version: number;
  messages: Message[];
  createdBanner?: boolean;
};

export default function ClubMeldungDetailPanel({
  tenantSlug,
  meldungId,
  mode,
  caseNumber,
  subject,
  description,
  category,
  status,
  version,
  messages,
  createdBanner,
}: Props) {
  const [reply, setReply] = useState("");
  const [audience, setAudience] = useState<"REPORTER_REPLY" | "INTERNAL_NOTE">("REPORTER_REPLY");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
            audience: mode === "reporter" ? "REPORTER_REPLY" : audience,
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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      {createdBanner ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Meldung {caseNumber} wurde aufgenommen. Der Verein bearbeitet sie so bald wie möglich.
        </p>
      ) : null}

      <header className="rounded-md border border-slate-200 bg-white p-4">
        <p className="font-mono text-xs text-slate-500">{caseNumber}</p>
        <h1 className="text-xl font-semibold text-slate-900">{subject}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {CLUB_MELDUNG_CATEGORY_LABELS[category]} · {CLUB_MELDUNG_STATUS_LABELS[status]}
        </p>
        <p className="mt-4 whitespace-pre-wrap text-sm text-slate-800">{description}</p>
      </header>

      <section aria-label="Verlauf" className="rounded-md border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Verlauf</h2>
        <ul className="mt-3 space-y-3">
          {messages.length === 0 ? (
            <li className="text-sm text-slate-500">Noch keine Nachrichten.</li>
          ) : (
            messages.map((message) => (
              <li key={message.id} className="rounded-md border border-slate-100 bg-slate-50 p-3 text-sm">
                <p className="text-xs text-slate-500">
                  {message.author.firstName} {message.author.lastName}
                  {mode === "internal" && message.audience === "INTERNAL_NOTE"
                    ? " · Interne Notiz"
                    : message.audience === "REPORTER_REPLY"
                      ? " · Antwort an meldende Person"
                      : ""}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-slate-800">{message.body}</p>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4">
        {mode === "internal" ? (
          <p className="mb-2 text-xs font-medium text-slate-600">
            Zielgruppe vor dem Senden:{" "}
            {audience === "INTERNAL_NOTE" ? "Interne Notiz" : "Antwort an meldende Person"}
          </p>
        ) : null}
        {mode === "internal" ? (
          <div className="mb-3 flex gap-2">
            <button
              type="button"
              className={`rounded-md border px-3 py-1 text-xs ${
                audience === "REPORTER_REPLY"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200"
              }`}
              onClick={() => setAudience("REPORTER_REPLY")}
            >
              Antwort an meldende Person
            </button>
            <button
              type="button"
              className={`rounded-md border px-3 py-1 text-xs ${
                audience === "INTERNAL_NOTE"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200"
              }`}
              onClick={() => setAudience("INTERNAL_NOTE")}
            >
              Interne Notiz
            </button>
          </div>
        ) : null}
        <textarea
          rows={4}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
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
        {mode === "internal" ? (
          <p className="mt-2 text-xs text-slate-500">Version {version}</p>
        ) : null}
      </section>
    </div>
  );
}