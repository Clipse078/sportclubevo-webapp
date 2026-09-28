"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PersonalSignatureComposerField } from "@/components/admin/communication/personal-signature/PersonalSignatureComposerField";
import { previewMessageWithPersonalSignature } from "@/lib/communication/personal-signature/personal-signature-compose";
import { cn } from "@/lib/cn";
import { CommunicationAttachmentPicker } from "@/components/admin/communication/attachments/CommunicationAttachmentPicker";
import { useCommunicationAttachmentUpload } from "@/components/admin/communication/attachments/use-communication-attachment-upload";
import { CommunicationSenderSelector } from "@/components/admin/communication/sender/CommunicationSenderSelector";

type RecipientChip = {
  personId: string;
  displayName: string;
  contextLabel: string;
};

type SearchResult = {
  personId: string;
  displayName: string;
  teamLabels: string[];
  orgUnitLabels: string[];
};

type DirectMessageMode = "MESSAGE" | "INFORM";

type Step = "recipients" | "content" | "options" | "review";

function contextLabel(result: SearchResult): string {
  const parts = [...result.teamLabels.slice(0, 2), ...result.orgUnitLabels.slice(0, 1)];
  return parts.join(" · ") || "Person";
}

export default function DirectMessageComposer() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("recipients");
  const [recipients, setRecipients] = useState<RecipientChip[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [mode, setMode] = useState<DirectMessageMode>("MESSAGE");
  const [channels, setChannels] = useState({ inApp: true, push: true, email: false });
  const [emailSenderIdentityId, setEmailSenderIdentityId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSearchIndex, setActiveSearchIndex] = useState(-1);
  const [signatureBody, setSignatureBody] = useState<string | null>(null);
  const [useSignature, setUseSignature] = useState(false);
  const {
    attachments,
    error: attachmentError,
    addFiles,
    removeAttachment,
    readyAttachmentIds,
    hasUnreadyAttachments,
  } = useCommunicationAttachmentUpload();

  useEffect(() => {
    async function loadSignature() {
      try {
        const res = await fetch("/api/communication/personal-signature");
        if (!res.ok) return;
        const data = (await res.json()) as {
          preference?: { bodyText?: string | null; useByDefault?: boolean };
        };
        const pref = data.preference;
        setSignatureBody(pref?.bodyText?.trim() || null);
        setUseSignature(Boolean(pref?.bodyText?.trim()) && pref?.useByDefault !== false);
      } catch {
        /* ignore */
      }
    }
    void loadSignature();
  }, []);

  const steps: { id: Step; label: string }[] = useMemo(
    () => [
      { id: "recipients", label: "Empfänger" },
      { id: "content", label: "Nachricht" },
      { id: "options", label: "Optionen" },
      { id: "review", label: "Überprüfen" },
    ],
    [],
  );

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    const handle = window.setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/communication/direct/recipients?q=${encodeURIComponent(q)}`);
        if (!res.ok) {
          setSearchResults([]);
          return;
        }
        const data = (await res.json()) as { recipients?: SearchResult[] };
        setSearchResults(data.recipients ?? []);
        setActiveSearchIndex(-1);
      } finally {
        setSearchLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(handle);
  }, [search]);

  const addRecipient = useCallback((result: SearchResult) => {
    setRecipients((prev) => {
      if (prev.some((r) => r.personId === result.personId)) return prev;
      return [
        ...prev,
        {
          personId: result.personId,
          displayName: result.displayName,
          contextLabel: contextLabel(result),
        },
      ];
    });
    setSearch("");
    setSearchResults([]);
  }, []);

  function removeRecipient(personId: string) {
    setRecipients((prev) => prev.filter((r) => r.personId !== personId));
  }

  function validateStep(target: Step): string | null {
    if (target === "content" || target === "options" || target === "review") {
      if (recipients.length === 0) return "Bitte mindestens einen Empfänger auswählen.";
    }
    if (target === "options" || target === "review") {
      if (!bodyText.trim() && readyAttachmentIds.length === 0) {
        return "Bitte eine Nachricht oder mindestens einen Anhang eingeben.";
      }
      if (hasUnreadyAttachments) return "Bitte warten Sie, bis alle Anhänge hochgeladen sind.";
    }
    return null;
  }

  function goToStep(next: Step) {
    const validationError = validateStep(next);
    if (validationError) {
      setError(validationError);
      if (recipients.length === 0) setStep("recipients");
      else if (!bodyText.trim()) setStep("content");
      return;
    }
    setError(null);
    setStep(next);
  }

  async function handleSend() {
    const validationError = validateStep("review");
    if (validationError) {
      setError(validationError);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/communication/direct/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientPersonIds: recipients.map((r) => r.personId),
          subject: subject.trim() || null,
          bodyText,
          mode: mode === "INFORM" ? "INFORM" : "MESSAGE",
          channelIntent: channels,
          includePersonalSignature: useSignature,
          attachmentIds: readyAttachmentIds,
          emailSenderIdentityId,
        }),
      });
      const data = (await res.json()) as { error?: string; conversationIds?: string[] };
      if (!res.ok) {
        setError(data.error ?? "Senden fehlgeschlagen.");
        return;
      }
      const firstConversation = data.conversationIds?.[0];
      if (firstConversation) {
        router.push(`/dashboard/communication/inbox?conversation=${firstConversation}`);
      } else {
        router.push("/dashboard/communication/inbox");
      }
    } catch {
      setError("Senden fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  function onSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (searchResults.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSearchIndex((i) => Math.min(i + 1, searchResults.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSearchIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter" && activeSearchIndex >= 0) {
      event.preventDefault();
      addRecipient(searchResults[activeSearchIndex]!);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <nav aria-label="Composer-Schritte" className="flex flex-wrap gap-2">
        {steps.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => goToStep(item.id)}
            aria-current={step === item.id ? "step" : undefined}
            className={cn(
              "rounded-full px-3 py-1 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]",
              step === item.id
                ? "bg-[var(--sce-primary)] text-white"
                : "bg-[var(--surface-2)] text-[var(--text-2)]",
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {step === "recipients" ? (
        <section aria-labelledby="dm-recipients-heading" className="space-y-4">
          <h2 id="dm-recipients-heading" className="text-base font-semibold">
            Empfänger
          </h2>
          <label className="block text-sm font-medium" htmlFor="dm-recipient-search">
            Person suchen
          </label>
          <input
            id="dm-recipient-search"
            type="search"
            role="combobox"
            aria-expanded={searchResults.length > 0}
            aria-controls="dm-recipient-listbox"
            aria-autocomplete="list"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder="Name, Team oder E-Mail"
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
          />
          {searchLoading ? (
            <p className="text-xs text-[var(--text-2)]">Suche …</p>
          ) : null}
          {searchResults.length > 0 ? (
            <ul
              id="dm-recipient-listbox"
              role="listbox"
              className="max-h-48 overflow-y-auto rounded-lg border border-[var(--border)]"
            >
              {searchResults.map((result, index) => (
                <li key={result.personId} role="option" aria-selected={index === activeSearchIndex}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sce-primary)]",
                      index === activeSearchIndex && "bg-[var(--surface-2)]",
                    )}
                    onClick={() => addRecipient(result)}
                  >
                    <span className="font-medium">{result.displayName}</span>
                    <span className="text-xs text-[var(--text-2)]">{contextLabel(result)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {recipients.length > 0 ? (
            <ul className="flex flex-wrap gap-2" aria-label="Ausgewählte Empfänger">
              {recipients.map((recipient) => (
                <li key={recipient.personId}>
                  <span className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-2)] px-3 py-1 text-sm">
                    <span>
                      {recipient.displayName}
                      <span className="text-[var(--text-2)]"> · {recipient.contextLabel}</span>
                    </span>
                    <button
                      type="button"
                      className="text-[var(--text-2)] hover:text-[var(--foreground)]"
                      aria-label={`${recipient.displayName} entfernen`}
                      onClick={() => removeRecipient(recipient.personId)}
                    >
                      ×
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--text-2)]">Noch keine Empfänger ausgewählt.</p>
          )}
          <div className="flex justify-end">
            <Button type="button" onClick={() => goToStep("content")}>
              Weiter
            </Button>
          </div>
        </section>
      ) : null}

      {step === "content" ? (
        <section aria-labelledby="dm-content-heading" className="space-y-4">
          <h2 id="dm-content-heading" className="text-base font-semibold">
            Nachricht
          </h2>
          <label className="block text-sm font-medium" htmlFor="dm-subject">
            Betreff (optional)
          </label>
          <input
            id="dm-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
          <label className="block text-sm font-medium" htmlFor="dm-body">
            Nachricht
          </label>
          <textarea
            id="dm-body"
            rows={8}
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
          />
          <CommunicationAttachmentPicker
            disabled={busy}
            attachments={attachments}
            error={attachmentError}
            onAddFiles={addFiles}
            onRemove={removeAttachment}
          />
          <div className="flex justify-between gap-2">
            <Button type="button" variant="secondary" onClick={() => setStep("recipients")}>
              Zurück
            </Button>
            <Button type="button" onClick={() => goToStep("options")}>
              Weiter
            </Button>
          </div>
        </section>
      ) : null}

      {step === "options" ? (
        <section aria-labelledby="dm-options-heading" className="space-y-4">
          <h2 id="dm-options-heading" className="text-base font-semibold">
            Optionen
          </h2>
          <fieldset>
            <legend className="text-sm font-medium">Modus</legend>
            <div className="mt-2 space-y-2">
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-[var(--border)] p-3">
                <input
                  type="radio"
                  name="dm-mode"
                  checked={mode === "MESSAGE"}
                  onChange={() => setMode("MESSAGE")}
                  className="mt-1"
                />
                <span>
                  <span className="block font-medium">Nachricht</span>
                  <span className="text-sm text-[var(--text-2)]">
                    Empfänger können direkt antworten.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-[var(--border)] p-3">
                <input
                  type="radio"
                  name="dm-mode"
                  checked={mode === "INFORM"}
                  onChange={() => setMode("INFORM")}
                  className="mt-1"
                />
                <span>
                  <span className="block font-medium">Nur informieren</span>
                  <span className="text-sm text-[var(--text-2)]">
                    Nur zur Information. Direkte Antworten sind deaktiviert.
                  </span>
                </span>
              </label>
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-medium">Kanäle</legend>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={channels.inApp}
                  onChange={(e) => setChannels((c) => ({ ...c, inApp: e.target.checked }))}
                />
                In-App
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={channels.push}
                  onChange={(e) => setChannels((c) => ({ ...c, push: e.target.checked }))}
                />
                Push
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={channels.email}
                  onChange={(e) => setChannels((c) => ({ ...c, email: e.target.checked }))}
                />
                E-Mail
              </label>
            </div>
          </fieldset>
          <CommunicationSenderSelector
            value={emailSenderIdentityId}
            onChange={setEmailSenderIdentityId}
            showOnlyWhenEmail
            emailChannelEnabled={channels.email}
          />
          <PersonalSignatureComposerField
            checkboxId="dm-use-signature"
            enabled={useSignature}
            onEnabledChange={setUseSignature}
            signatureBody={signatureBody}
            messageBody={bodyText}
          />
          <div className="flex justify-between gap-2">
            <Button type="button" variant="secondary" onClick={() => setStep("content")}>
              Zurück
            </Button>
            <Button type="button" onClick={() => goToStep("review")}>
              Weiter
            </Button>
          </div>
        </section>
      ) : null}

      {step === "review" ? (
        <section aria-labelledby="dm-review-heading" className="space-y-4">
          <h2 id="dm-review-heading" className="text-base font-semibold">
            Überprüfen
          </h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-medium text-[var(--text-2)]">Empfänger</dt>
              <dd>{recipients.map((r) => r.displayName).join(", ")}</dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--text-2)]">Modus</dt>
              <dd>
                {mode === "INFORM" ? (
                  <>
                    Nur informieren
                    <span className="block text-[var(--text-2)]">Antworten deaktiviert</span>
                  </>
                ) : (
                  "Nachricht · Antworten erlaubt"
                )}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--text-2)]">Kanäle</dt>
              <dd>
                {[
                  channels.inApp && "In-App",
                  channels.push && "Push",
                  channels.email && "E-Mail",
                ]
                  .filter(Boolean)
                  .join(", ") || "Keine Kanäle"}
              </dd>
            </div>
            {subject.trim() ? (
              <div>
                <dt className="font-medium text-[var(--text-2)]">Betreff</dt>
                <dd>{subject}</dd>
              </div>
            ) : null}
            <div>
              <dt className="font-medium text-[var(--text-2)]">Nachricht</dt>
              <dd className="whitespace-pre-wrap">
                {
                  previewMessageWithPersonalSignature(
                    bodyText,
                    useSignature ? signatureBody : null,
                  ).combined
                }
              </dd>
            </div>
          </dl>
          <div className="flex justify-between gap-2">
            <Button type="button" variant="secondary" onClick={() => setStep("options")}>
              Zurück
            </Button>
            <Button type="button" onClick={handleSend} disabled={busy}>
              {busy ? "Senden …" : "Nachricht senden"}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
