"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CommunicationScheduleFields from "@/components/admin/communication/scheduling/CommunicationScheduleFields";
import {
  MITTEILUNG_PREFERENCES_NOTICE,
  MITTEILUNG_PUBLISH_NOTICE,
  MITTEILUNG_SAFEGUARDING_NOTICE,
  MITTEILUNG_KIND_LABEL,
} from "@/lib/communication/club/mitteilungen-display";
import {
  inferMitteilungAudienceEditorState,
  type MitteilungAudienceEditorMode,
} from "@/lib/communication/club/mitteilungen-audience-editor";
import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import { PersonalSignatureComposerField } from "@/components/admin/communication/personal-signature/PersonalSignatureComposerField";
import { previewMessageWithPersonalSignature } from "@/lib/communication/personal-signature/personal-signature-compose";
import { CommunicationAttachmentPicker } from "@/components/admin/communication/attachments/CommunicationAttachmentPicker";
import { useCommunicationAttachmentUpload } from "@/components/admin/communication/attachments/use-communication-attachment-upload";

type TargetGroupOption = { id: string; name: string; status: string };

type TemplateOption = { id: string; name: string; kind: string };

type Props = {
  targetGroups: TargetGroupOption[];
  tenantTimezone?: string;
  communicationId?: string;
  initialKind?: "MESSAGE" | "ANNOUNCEMENT" | "ALERT";
  initialSubject?: string;
  initialBody?: string;
  initialAudienceSpec?: CommunicationAudienceSpec;
  readOnly?: boolean;
  templateOptions?: TemplateOption[];
};

function sectionHeading(id: string, title: string) {
  return (
    <h2 id={id} className="text-base font-semibold text-[var(--foreground)]">
      {title}
    </h2>
  );
}

export default function ClubCommunicationComposer({
  targetGroups,
  tenantTimezone = "Europe/Zurich",
  communicationId,
  initialKind = "ANNOUNCEMENT",
  initialSubject = "",
  initialBody = "",
  initialAudienceSpec,
  readOnly = false,
  templateOptions = [],
}: Props) {
  const router = useRouter();
  const initialAudience = useMemo(
    () =>
      initialAudienceSpec
        ? inferMitteilungAudienceEditorState(initialAudienceSpec)
        : { mode: "WHOLE_ORG" as MitteilungAudienceEditorMode, selectedGroupIds: [] as string[] },
    [initialAudienceSpec],
  );

  const [kind, setKind] = useState<"MESSAGE" | "ANNOUNCEMENT" | "ALERT">(initialKind);
  const [subject, setSubject] = useState(initialSubject);
  const [bodyText, setBodyText] = useState(initialBody);
  const [audienceMode, setAudienceMode] = useState<MitteilungAudienceEditorMode>(initialAudience.mode);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(initialAudience.selectedGroupIds);
  const [preview, setPreview] = useState<{
    candidates: number;
    effective: number;
    excluded: number;
    scopeNotice: string | null;
    audienceSummary: string;
  } | null>(null);
  const [emailReady, setEmailReady] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAtLocal, setScheduledAtLocal] = useState("");
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
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
    async function loadSignaturePreference() {
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
    void loadSignaturePreference();
  }, []);

  useEffect(() => {
    async function loadEmailReadiness() {
      try {
        const res = await fetch("/api/communication/email/readiness");
        if (!res.ok) return;
        const data = (await res.json()) as { readiness?: { ready?: boolean } };
        setEmailReady(Boolean(data.readiness?.ready));
      } catch {
        setEmailReady(null);
      }
    }
    void loadEmailReadiness();
  }, []);

  function buildAudienceSpec(): CommunicationAudienceSpec {
    if (audienceMode === "WHOLE_ORG") {
      return {
        composition: "UNION",
        components: [{ structural: { wholeOrganisation: true } }],
      };
    }
    return {
      composition: "UNION",
      components: selectedGroupIds.map((id) => ({ savedTargetGroupIds: [id] })),
    };
  }

  const audienceSummaryLabel = useMemo(() => {
    if (preview?.audienceSummary) return preview.audienceSummary;
    if (audienceMode === "WHOLE_ORG") return "Ganzer Verein";
    if (selectedGroupIds.length === 0) return "Keine Zielgruppe ausgewählt";
    const names = selectedGroupIds
      .map((id) => targetGroups.find((tg) => tg.id === id)?.name)
      .filter(Boolean);
    return names.length > 0 ? names.join(", ") : `${selectedGroupIds.length} Zielgruppe(n)`;
  }, [audienceMode, preview?.audienceSummary, selectedGroupIds, targetGroups]);

  const compatibleTemplates = templateOptions.filter((t) => t.kind === kind);

  async function applyTemplate() {
    if (!selectedTemplateId) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/communication/templates/${selectedTemplateId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Vorlage konnte nicht geladen werden");
      const template = data.template as {
        kind: string;
        subject?: string | null;
        bodyText: string;
        audienceSpecJson?: CommunicationAudienceSpec;
      };
      if (template.kind !== kind) {
        throw new Error("Diese Vorlage passt nicht zur gewählten Mitteilungs-Art.");
      }
      setSubject(template.subject?.trim() || "");
      setBodyText(template.bodyText);
      if (template.audienceSpecJson) {
        const inferred = inferMitteilungAudienceEditorState(template.audienceSpecJson);
        setAudienceMode(inferred.mode);
        setSelectedGroupIds(inferred.selectedGroupIds);
      }
      setPreview(null);
      setReviewConfirmed(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Vorlage konnte nicht übernommen werden");
    } finally {
      setBusy(false);
    }
  }

  async function runPreview() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/communication/club/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, audienceSpec: buildAudienceSpec() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Empfängervorschau fehlgeschlagen");
      setPreview({
        candidates: data.candidates,
        effective: data.effective,
        excluded: data.excluded,
        scopeNotice: data.scopeNotice,
        audienceSummary: data.audienceSummary,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Empfängervorschau fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  async function persistDraft(): Promise<string> {
    const audienceSpec = buildAudienceSpec();
    if (communicationId) {
      const res = await fetch(`/api/communication/club/${communicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, bodyText, audienceSpec, attachmentIds: readyAttachmentIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Entwurf konnte nicht gespeichert werden");
      return communicationId;
    }
    const res = await fetch("/api/communication/club", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        subject,
        bodyText,
        audienceSpec,
          attachmentIds: readyAttachmentIds,
          includePersonalSignature: kind === "MESSAGE" ? useSignature : false,
        }),
      });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Entwurf konnte nicht gespeichert werden");
    return data.id as string;
  }

  async function handleSend(publishMode: "draft" | "send" | "schedule") {
    setError(null);
    setBusy(true);
    try {
      if (publishMode === "send" || publishMode === "schedule") {
        if (!bodyText.trim() && readyAttachmentIds.length === 0) {
          throw new Error("Bitte geben Sie eine Nachricht oder mindestens einen Anhang ein.");
        }
        if (hasUnreadyAttachments) {
          throw new Error("Bitte warten Sie, bis alle Anhänge hochgeladen sind.");
        }
        if (audienceMode === "TARGET_GROUPS" && selectedGroupIds.length === 0) {
          throw new Error("Bitte wählen Sie mindestens eine Zielgruppe.");
        }
        if (!reviewConfirmed) {
          throw new Error("Bitte bestätigen Sie die Zusammenfassung vor dem Senden.");
        }
      }

      const audienceSpec = buildAudienceSpec();

      if (publishMode === "draft") {
        const id = await persistDraft();
        router.push(`/dashboard/communication/mitteilungen/${id}`);
        router.refresh();
        return;
      }

      if (publishMode === "schedule") {
        const draftId = await persistDraft();
        const schedRes = await fetch(`/api/communication/schedules/${draftId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scheduledAtLocal, timezone: tenantTimezone }),
        });
        const schedData = await schedRes.json();
        if (!schedRes.ok) throw new Error(schedData.error ?? "Planung fehlgeschlagen");
        router.push(`/dashboard/communication/mitteilungen/${draftId}`);
        router.refresh();
        return;
      }

      if (communicationId) {
        await persistDraft();
        const pubRes = await fetch(`/api/communication/club/${communicationId}/publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            includePersonalSignature: kind === "MESSAGE" ? useSignature : false,
          }),
        });
        const pubData = await pubRes.json();
        if (!pubRes.ok) throw new Error(pubData.error ?? "Versand fehlgeschlagen");
        router.push(`/dashboard/communication/mitteilungen/${communicationId}`);
        router.refresh();
        return;
      }

      const res = await fetch("/api/communication/club/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          subject,
          bodyText,
          audienceSpec,
          attachmentIds: readyAttachmentIds,
          includePersonalSignature: kind === "MESSAGE" ? useSignature : false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Versand fehlgeschlagen");
      router.push(`/dashboard/communication/mitteilungen/${data.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Aktion fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  function toggleGroup(id: string) {
    setPreview(null);
    setReviewConfirmed(false);
    setSelectedGroupIds((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  }

  const timingSummary = scheduleEnabled
    ? scheduledAtLocal
      ? `${scheduledAtLocal} (${tenantTimezone})`
      : "Bitte Datum und Uhrzeit wählen"
    : "Jetzt senden";

  if (readOnly) {
    return (
      <div className="space-y-4">
        <p className="whitespace-pre-wrap text-sm text-[var(--foreground)]">{bodyText}</p>
      </div>
    );
  }

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => e.preventDefault()}
      aria-label="Mitteilung erstellen"
    >
      <section aria-labelledby="mitteilung-inhalt-heading" className="space-y-4 rounded-xl border border-[var(--border)] p-4 md:p-6">
        {sectionHeading("mitteilung-inhalt-heading", "Inhalt")}
        <p className="text-sm text-[var(--text-2)]">Was möchten Sie mitteilen?</p>
        {compatibleTemplates.length > 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-2)] p-4">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-[var(--foreground)]">Vorlage (optional)</span>
              <select
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2"
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                aria-label="Vorlage auswählen"
              >
                <option value="">Keine Vorlage</option>
                {compatibleTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!selectedTemplateId || busy}
                onClick={() => void applyTemplate()}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--surface-1)]"
              >
                Vorlage übernehmen
              </button>
              <Link
                href="/dashboard/communication/vorlagen"
                className="rounded-lg px-3 py-1.5 text-sm text-[var(--sce-primary)] hover:underline"
              >
                Vorlagen verwalten
              </Link>
            </div>
          </div>
        ) : null}
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-[var(--foreground)]">Art</span>
            <select
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2"
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as typeof kind);
                setReviewConfirmed(false);
              }}
            >
              <option value="ANNOUNCEMENT">{MITTEILUNG_KIND_LABEL.ANNOUNCEMENT}</option>
              <option value="ALERT">{MITTEILUNG_KIND_LABEL.ALERT}</option>
              <option value="MESSAGE">{MITTEILUNG_KIND_LABEL.MESSAGE}</option>
            </select>
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block font-medium text-[var(--foreground)]">Titel / Betreff</span>
            <input
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setReviewConfirmed(false);
              }}
              placeholder={kind === "ALERT" ? "Pflicht bei Alarm" : "Kurzer Titel für die Mitteilung"}
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[var(--foreground)]">Nachricht</span>
          <textarea
            className="min-h-[160px] w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2"
            value={bodyText}
            onChange={(e) => {
              setBodyText(e.target.value);
              setReviewConfirmed(false);
            }}
          />
        </label>
        <CommunicationAttachmentPicker
          disabled={busy}
          attachments={attachments}
          error={attachmentError}
          onAddFiles={addFiles}
          onRemove={removeAttachment}
        />
        {kind === "MESSAGE" ? (
          <PersonalSignatureComposerField
            checkboxId="mitteilung-use-signature"
            enabled={useSignature}
            onEnabledChange={(enabled) => {
              setUseSignature(enabled);
              setReviewConfirmed(false);
            }}
            signatureBody={signatureBody}
            messageBody={bodyText}
          />
        ) : null}
      </section>

      <section aria-labelledby="mitteilung-empfaenger-heading" className="space-y-4 rounded-xl border border-[var(--border)] p-4 md:p-6">
        {sectionHeading("mitteilung-empfaenger-heading", "Empfänger")}
        <p className="text-sm text-[var(--text-2)]">An wen soll die Mitteilung gehen?</p>
        <fieldset className="space-y-3">
          <legend className="sr-only">Zielgruppe wählen</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="audienceMode"
              checked={audienceMode === "WHOLE_ORG"}
              onChange={() => {
                setAudienceMode("WHOLE_ORG");
                setPreview(null);
                setReviewConfirmed(false);
              }}
            />
            Ganzer Verein
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="audienceMode"
              checked={audienceMode === "TARGET_GROUPS"}
              onChange={() => {
                setAudienceMode("TARGET_GROUPS");
                setPreview(null);
                setReviewConfirmed(false);
              }}
            />
            Gespeicherte Zielgruppen
          </label>
        </fieldset>
        {audienceMode === "TARGET_GROUPS" ? (
          <div className="flex flex-wrap gap-2">
            {targetGroups.map((tg) => (
              <button
                key={tg.id}
                type="button"
                onClick={() => toggleGroup(tg.id)}
                aria-pressed={selectedGroupIds.includes(tg.id)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)] ${
                  selectedGroupIds.includes(tg.id)
                    ? "border-[var(--sce-primary)] bg-[var(--sce-primary)]/10 text-[var(--sce-primary)]"
                    : "border-[var(--border)] text-[var(--text-2)]"
                }`}
              >
                {tg.name}
              </button>
            ))}
            {targetGroups.length === 0 ? (
              <p className="text-xs text-[var(--text-2)]">Keine aktiven Zielgruppen vorhanden.</p>
            ) : null}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void runPreview()}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium"
          >
            Empfängervorschau
          </button>
          {preview ? (
            <p className="text-sm text-[var(--text-2)]">
              <strong>{preview.effective}</strong> Personen in der Zielgruppe
              {preview.excluded > 0 ? ` (${preview.excluded} ausgeschlossen)` : ""}
            </p>
          ) : null}
        </div>
        <p className="text-xs text-[var(--text-2)]">{MITTEILUNG_PREFERENCES_NOTICE}</p>
        <p className="text-xs text-[var(--text-2)]">{MITTEILUNG_SAFEGUARDING_NOTICE}</p>
        {preview?.scopeNotice ? (
          <p className="text-xs text-[var(--text-2)]">{preview.scopeNotice}</p>
        ) : null}
      </section>

      <section aria-labelledby="mitteilung-kanaele-heading" className="space-y-3 rounded-xl border border-[var(--border)] p-4 md:p-6">
        {sectionHeading("mitteilung-kanaele-heading", "Kanäle")}
        <p className="text-sm text-[var(--text-2)]">Über welche Kanäle wird zugestellt?</p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <input type="checkbox" checked readOnly disabled aria-readonly="true" />
            In-App
          </li>
          <li className="flex items-center gap-2">
            <input type="checkbox" checked readOnly disabled aria-readonly="true" />
            Push
          </li>
          <li className="flex items-center gap-2">
            <input type="checkbox" checked readOnly disabled aria-readonly="true" />
            E-Mail (wenn verfügbar)
          </li>
        </ul>
        <p className="text-xs text-[var(--text-2)]">
          E-Mail-Versand bereit:{" "}
          {emailReady === null ? "…" : emailReady ? "Ja" : "Nein — Absender prüfen"}
        </p>
      </section>

      <section aria-labelledby="mitteilung-zeitpunkt-heading" className="rounded-xl border border-[var(--border)] p-4 md:p-6">
        {sectionHeading("mitteilung-zeitpunkt-heading", "Zeitpunkt")}
        <div className="mt-4">
          <CommunicationScheduleFields
            tenantTimezone={tenantTimezone}
            scheduledAtLocal={scheduledAtLocal}
            onScheduledAtLocalChange={(value) => {
              setScheduledAtLocal(value);
              setReviewConfirmed(false);
            }}
            scheduleEnabled={scheduleEnabled}
            onScheduleEnabledChange={(enabled) => {
              setScheduleEnabled(enabled);
              setReviewConfirmed(false);
            }}
          />
        </div>
      </section>

      <section
        aria-labelledby="mitteilung-review-heading"
        className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/30 p-4 md:p-6"
      >
        {sectionHeading("mitteilung-review-heading", "Überprüfen")}
        <p className="text-sm text-[var(--text-2)]">Ist alles korrekt?</p>
        <dl className="grid gap-3 text-sm md:grid-cols-2">
          <div>
            <dt className="text-[var(--text-2)]">Titel</dt>
            <dd className="font-medium">{subject.trim() || "—"}</dd>
          </div>
          <div>
            <dt className="text-[var(--text-2)]">Art</dt>
            <dd>{MITTEILUNG_KIND_LABEL[kind]}</dd>
          </div>
          <div className="md:col-span-2">
            <dt className="text-[var(--text-2)]">Nachricht</dt>
            <dd className="whitespace-pre-wrap">
              {kind === "MESSAGE"
                ? previewMessageWithPersonalSignature(
                    bodyText,
                    useSignature ? signatureBody : null,
                  ).combined.trim() || "—"
                : bodyText.trim() || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--text-2)]">Empfänger</dt>
            <dd>{audienceSummaryLabel}</dd>
          </div>
          <div>
            <dt className="text-[var(--text-2)]">Zielpersonen (Vorschau)</dt>
            <dd>{preview ? `${preview.effective} Personen` : "Vorschau noch nicht geladen"}</dd>
          </div>
          <div>
            <dt className="text-[var(--text-2)]">Kanäle</dt>
            <dd>In-App, Push, E-Mail (wenn bereit)</dd>
          </div>
          <div>
            <dt className="text-[var(--text-2)]">Zeitpunkt</dt>
            <dd>{timingSummary}</dd>
          </div>
        </dl>
        <p className="text-xs text-[var(--text-2)]">{MITTEILUNG_PUBLISH_NOTICE}</p>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={reviewConfirmed}
            onChange={(e) => setReviewConfirmed(e.target.checked)}
          />
          <span>Ich habe Inhalt, Empfänger, Kanäle und Zeitpunkt geprüft.</span>
        </label>
      </section>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleSend("draft")}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium"
        >
          Entwurf speichern
        </button>
        {scheduleEnabled ? (
          <button
            type="button"
            disabled={busy || !scheduledAtLocal}
            onClick={() => void handleSend("schedule")}
            className="rounded-lg bg-[var(--sce-primary)] px-4 py-2 text-sm font-semibold text-white"
          >
            Mitteilung planen
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleSend("send")}
            className="rounded-lg bg-[var(--sce-primary)] px-4 py-2 text-sm font-semibold text-white"
          >
            Mitteilung senden
          </button>
        )}
      </div>
    </form>
  );
}
