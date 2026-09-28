"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CommunicationScheduleFields from "@/components/admin/communication/scheduling/CommunicationScheduleFields";
import {
  inferKampagnenAudienceEditorState,
  type KampagnenAudienceEditorMode,
} from "@/lib/communication/campaign/kampagnen-audience-editor";
import {
  KAMPAGNE_PREFERENCES_NOTICE,
  KAMPAGNE_PUBLISH_NOTICE,
  KAMPAGNE_SAFEGUARDING_NOTICE,
  KAMPAGNE_SPONSOR_COMMERCIAL_NOTICE,
} from "@/lib/communication/campaign/kampagnen-display";
import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import CommunicationAudienceSelector, {
  type CommunicationAudiencePreviewState,
} from "@/components/admin/communication/audience/CommunicationAudienceSelector";
import {
  buildCommunicationAudienceSpec,
  communicationAudienceSelectionIsEmpty,
  emptyCommunicationAudienceSelection,
  inferCommunicationAudienceSelection,
  type CommunicationAudienceSelection,
} from "@/lib/communication/audience/communication-audience-selection";
import {
  formatCampaignChannelSummary,
  type CampaignOrchestrationMeta,
} from "@/lib/communication/campaign/campaign-orchestration-meta";
import { CommunicationAttachmentPicker } from "@/components/admin/communication/attachments/CommunicationAttachmentPicker";
import { useCommunicationAttachmentUpload } from "@/components/admin/communication/attachments/use-communication-attachment-upload";
import { CommunicationSenderSelector } from "@/components/admin/communication/sender/CommunicationSenderSelector";
import { PersonalisationFieldInsert } from "@/components/admin/communication/personalisation/PersonalisationFieldInsert";
import { PersonalisationComposerPreview } from "@/components/admin/communication/personalisation/PersonalisationComposerPreview";
import { insertPersonalisationAtSelection } from "@/lib/communication/personalisation/insert-personalisation-at-selection";
import type { CommunicationContextRef } from "@/lib/communication/platform/communication-context";

type TargetGroupOption = { id: string; name: string; status: string };

type SponsorOrganisationOption = {
  id: string;
  name: string;
  contacts: { id: string; displayName: string; isPrimary: boolean }[];
};

type TemplateOption = { id: string; name: string };

type Props = {
  targetGroups: TargetGroupOption[];
  sponsorOrganisations?: SponsorOrganisationOption[];
  templateOptions?: TemplateOption[];
  canManageTemplates?: boolean;
  campaignId?: string;
  initialInternalName?: string;
  initialSubject?: string;
  initialBody?: string;
  initialAudienceSpec?: CommunicationAudienceSpec;
  initialAudienceMode?: KampagnenAudienceEditorMode;
  initialSelectedGroupIds?: string[];
  initialSponsorMode?: "ALL_ACTIVE" | "SELECTED";
  initialSponsorOrganisationIds?: string[];
  initialSponsorContactIds?: string[];
  initialOrchestration?: CampaignOrchestrationMeta;
  tenantTimezone?: string;
  canSaveAsTemplate?: boolean;
  tenantId?: string;
};

function sectionHeading(id: string, title: string) {
  return (
    <h2 id={id} className="text-base font-semibold text-[var(--foreground)]">
      {title}
    </h2>
  );
}

export default function CampaignComposer({
  targetGroups: _targetGroups,
  sponsorOrganisations = [],
  templateOptions = [],
  canManageTemplates = false,
  campaignId,
  initialInternalName = "",
  initialSubject = "",
  initialBody = "",
  initialAudienceSpec,
  initialAudienceMode = "WHOLE_ORG",
  initialSelectedGroupIds = [],
  initialSponsorMode = "ALL_ACTIVE",
  initialSponsorOrganisationIds = [],
  initialSponsorContactIds = [],
  initialOrchestration,
  tenantTimezone = "Europe/Zurich",
  canSaveAsTemplate = false,
  tenantId,
}: Props) {
  const organisationContextRef: CommunicationContextRef | null = tenantId
    ? { kind: "ORGANISATION", tenantId }
    : null;
  const router = useRouter();
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  function insertPersonalisationToken(token: string, target: "subject" | "body") {
    insertPersonalisationAtSelection({
      element: target === "subject" ? subjectInputRef.current : bodyTextareaRef.current,
      currentValue: target === "subject" ? subject : bodyText,
      token,
      onValueChange: (next) => {
        if (target === "subject") setSubject(next);
        else setBodyText(next);
        invalidateReview();
      },
    });
  }
  const inferredAudience = useMemo(
    () =>
      initialAudienceSpec
        ? inferKampagnenAudienceEditorState(initialAudienceSpec)
        : null,
    [initialAudienceSpec],
  );

  const [internalName, setInternalName] = useState(initialInternalName);
  const [subject, setSubject] = useState(initialSubject);
  const [bodyText, setBodyText] = useState(initialBody);
  const [audienceMode, setAudienceMode] = useState<KampagnenAudienceEditorMode>(
    inferredAudience?.mode ?? initialAudienceMode,
  );
  const [audienceSelection, setAudienceSelection] = useState<CommunicationAudienceSelection>(() => {
    if (initialAudienceSpec && inferredAudience?.mode !== "SPONSORS") {
      return inferCommunicationAudienceSelection(initialAudienceSpec);
    }
    if (initialAudienceMode === "TARGET_GROUPS" && initialSelectedGroupIds.length > 0) {
      return {
        ...emptyCommunicationAudienceSelection(),
        targetGroupIds: initialSelectedGroupIds,
      };
    }
    return { ...emptyCommunicationAudienceSelection(), wholeOrganisation: true };
  });
  const [audiencePreview, setAudiencePreview] = useState<CommunicationAudiencePreviewState | null>(
    null,
  );
  const [largeAudienceConfirmed, setLargeAudienceConfirmed] = useState(false);
  const [sponsorMode, setSponsorMode] = useState<"ALL_ACTIVE" | "SELECTED">(
    inferredAudience?.sponsorMode ?? initialSponsorMode,
  );
  const [selectedSponsorOrgIds, setSelectedSponsorOrgIds] = useState<string[]>(
    inferredAudience?.sponsorOrganisationIds ?? initialSponsorOrganisationIds,
  );
  const [selectedSponsorContactIds, setSelectedSponsorContactIds] = useState<string[]>(
    inferredAudience?.sponsorContactIds ?? initialSponsorContactIds,
  );
  const [inAppEnabled, setInAppEnabled] = useState(initialOrchestration?.channels.inApp ?? true);
  const [pushEnabled, setPushEnabled] = useState(initialOrchestration?.channels.push ?? true);
  const [emailChannelEnabled, setEmailChannelEnabled] = useState(
    initialOrchestration?.channels.email ?? true,
  );
  const [sponsorPreview, setSponsorPreview] = useState<{
    candidates: number;
    effective: number;
    excluded: number;
    scopeNotice: string | null;
    sponsorAudience?: {
      sponsorContactCount: number;
      externalContactCount: number;
    } | null;
  } | null>(null);
  const [emailReady, setEmailReady] = useState<boolean | null>(null);
  const [emailSenderIdentityId, setEmailSenderIdentityId] = useState<string | null>(
    initialOrchestration?.emailSenderIdentityId ?? null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAtLocal, setScheduledAtLocal] = useState("");
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const {
    attachments,
    error: attachmentError,
    addFiles,
    removeAttachment,
    readyAttachmentIds,
    hasUnreadyAttachments,
  } = useCommunicationAttachmentUpload();

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

  useEffect(() => {
    void loadEmailReadiness();
  }, []);

  useEffect(() => {
    if (audienceMode !== "SPONSORS") {
      setSponsorPreview(null);
      return undefined;
    }
    let cancelled = false;
    const handle = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/communication/campaign/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audienceSpec: buildAudienceSpec() }),
        });
        const data = await res.json();
        if (cancelled || !res.ok) return;
        setSponsorPreview({
          candidates: data.candidates,
          effective: data.effective,
          excluded: data.excluded,
          scopeNotice: data.scopeNotice,
          sponsorAudience: data.sponsorAudience,
        });
      } catch {
        if (!cancelled) setSponsorPreview(null);
      }
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
    // buildAudienceSpec reads sponsor + member selection from closure
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional debounced sponsor preview
  }, [audienceMode, audienceSelection, sponsorMode, selectedSponsorOrgIds, selectedSponsorContactIds]);

  function buildAudienceSpec(): CommunicationAudienceSpec {
    if (audienceMode === "SPONSORS") {
      if (sponsorMode === "ALL_ACTIVE") {
        return {
          composition: "UNION",
          components: [{ sponsor: { allActiveSponsors: true } }],
        };
      }
      return {
        composition: "UNION",
        components: [
          {
            sponsor: {
              sponsorOrganisationIds: selectedSponsorOrgIds,
              sponsorContactIds: selectedSponsorContactIds,
            },
          },
        ],
      };
    }
    return buildCommunicationAudienceSpec(audienceSelection);
  }

  function buildOrchestration(): CampaignOrchestrationMeta {
    return {
      schemaVersion: 1,
      channels: {
        inApp: inAppEnabled,
        push: pushEnabled,
        email: emailChannelEnabled,
      },
      scheduling: {
        mode: scheduleEnabled ? "SCHEDULED" : "IMMEDIATE",
        scheduledAt: scheduleEnabled ? scheduledAtLocal || null : null,
        timezone: scheduleEnabled ? tenantTimezone : null,
      },
      ...(emailSenderIdentityId ? { emailSenderIdentityId } : {}),
    };
  }

  const audienceSummaryLabel = useMemo(() => {
    if (audienceMode !== "SPONSORS") {
      if (audiencePreview?.audienceSummary) return audiencePreview.audienceSummary;
      if (audienceSelection.wholeOrganisation) return "Gesamter Verein";
      if (communicationAudienceSelectionIsEmpty(audienceSelection)) {
        return "Keine Empfänger ausgewählt";
      }
      return "Empfängerauswahl";
    }
    if (audienceMode === "SPONSORS") {
      if (sponsorMode === "ALL_ACTIVE") return "Alle aktiven Sponsoren / Partner";
      const orgNames = selectedSponsorOrgIds
        .map((id) => sponsorOrganisations.find((o) => o.id === id)?.name)
        .filter(Boolean);
      return orgNames.length > 0 ? orgNames.join(", ") : "Ausgewählte Sponsoren";
    }
    return "Empfängerauswahl";
  }, [
    audienceMode,
    audiencePreview?.audienceSummary,
    audienceSelection,
    selectedSponsorOrgIds,
    sponsorMode,
    sponsorOrganisations,
  ]);

  const channelSummary = formatCampaignChannelSummary(buildOrchestration());

  const timingSummary = scheduleEnabled
    ? scheduledAtLocal
      ? `${scheduledAtLocal} (${tenantTimezone})`
      : "Bitte Datum und Uhrzeit wählen"
    : "Jetzt veröffentlichen";

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
        internalName?: string | null;
        subject?: string | null;
        bodyText: string;
        audienceSpecJson?: CommunicationAudienceSpec;
        orchestrationMetaJson?: CampaignOrchestrationMeta;
      };
      if (template.kind !== "CAMPAIGN") {
        throw new Error("Diese Vorlage ist nicht für Kampagnen.");
      }
      setInternalName(template.internalName?.trim() || internalName);
      setSubject(template.subject?.trim() || "");
      setBodyText(template.bodyText);
      if (template.audienceSpecJson) {
        const inferred = inferKampagnenAudienceEditorState(template.audienceSpecJson);
        setAudienceMode(inferred.mode);
        if (inferred.mode !== "SPONSORS") {
          setAudienceSelection(inferCommunicationAudienceSelection(template.audienceSpecJson));
        }
        setSponsorMode(inferred.sponsorMode);
        setSelectedSponsorOrgIds(inferred.sponsorOrganisationIds);
        setSelectedSponsorContactIds(inferred.sponsorContactIds);
      }
      if (template.orchestrationMetaJson) {
        setInAppEnabled(template.orchestrationMetaJson.channels.inApp);
        setPushEnabled(template.orchestrationMetaJson.channels.push);
        setEmailChannelEnabled(template.orchestrationMetaJson.channels.email);
      }
      setSponsorPreview(null);
      setReviewConfirmed(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Vorlage konnte nicht übernommen werden");
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft(): Promise<string> {
    const audienceSpec = buildAudienceSpec();
    const orchestration = buildOrchestration();
    const payload = {
      internalName,
      subject,
      bodyText,
      audienceSpec,
      orchestration,
      attachmentIds: readyAttachmentIds,
    };
    if (campaignId) {
      const res = await fetch(`/api/communication/campaign/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Entwurf konnte nicht gespeichert werden");
      return campaignId;
    }
    const res = await fetch("/api/communication/campaign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Entwurf konnte nicht gespeichert werden");
    return data.id as string;
  }

  async function schedulePublication(communicationId: string) {
    const res = await fetch(`/api/communication/schedules/${communicationId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledAtLocal, timezone: tenantTimezone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Planung fehlgeschlagen");
  }

  async function saveAsTemplate(communicationId: string) {
    const name = window.prompt("Name der Vorlage", internalName || subject || "Kampagne");
    if (!name?.trim()) return;
    const res = await fetch("/api/communication/templates/from-communication", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ communicationId, name: name.trim() }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Vorlage konnte nicht gespeichert werden");
  }

  function validateBeforePublish() {
    if (!internalName.trim()) throw new Error("Bitte geben Sie einen internen Kampagnennamen ein.");
    if (!bodyText.trim() && readyAttachmentIds.length === 0) {
      throw new Error("Bitte geben Sie den Kampagneninhalt oder mindestens einen Anhang ein.");
    }
    if (hasUnreadyAttachments) {
      throw new Error("Bitte warten Sie, bis alle Anhänge hochgeladen sind.");
    }
    if (audienceMode !== "SPONSORS" && communicationAudienceSelectionIsEmpty(audienceSelection)) {
      throw new Error("Bitte wählen Sie mindestens einen Empfänger.");
    }
    if (
      audienceMode !== "SPONSORS" &&
      (audienceSelection.wholeOrganisation || (audiencePreview?.effective ?? 0) > 50) &&
      !largeAudienceConfirmed
    ) {
      throw new Error("Bitte bestätigen Sie den Versand an eine große Empfängergruppe.");
    }
    if (
      audienceMode === "SPONSORS" &&
      sponsorMode === "SELECTED" &&
      selectedSponsorOrgIds.length === 0 &&
      selectedSponsorContactIds.length === 0
    ) {
      throw new Error("Bitte wählen Sie mindestens einen Sponsor oder Kontakt.");
    }
    if (!inAppEnabled && !pushEnabled && !emailChannelEnabled) {
      throw new Error("Bitte wählen Sie mindestens einen Kanal.");
    }
    if (emailChannelEnabled && emailReady === false) {
      throw new Error(
        "E-Mail ist nicht bereit. Deaktivieren Sie E-Mail oder konfigurieren Sie den Absender.",
      );
    }
    if (!reviewConfirmed) {
      throw new Error("Bitte bestätigen Sie die Zusammenfassung vor der Veröffentlichung.");
    }
  }

  async function handleAction(mode: "draft" | "publish" | "schedule") {
    setError(null);
    setBusy(true);
    try {
      if (mode !== "draft") {
        validateBeforePublish();
      }
      const id = await saveDraft();
      if (mode === "draft") {
        router.push(`/dashboard/communication/kampagnen/${id}`);
        router.refresh();
        return;
      }
      if (mode === "publish") {
        const pubRes = await fetch(`/api/communication/campaign/${id}/publish`, { method: "POST" });
        const pubData = await pubRes.json();
        if (!pubRes.ok) throw new Error(pubData.error ?? "Veröffentlichung fehlgeschlagen");
      }
      if (mode === "schedule") {
        await schedulePublication(id);
      }
      router.push(`/dashboard/communication/kampagnen/${id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Aktion fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  function toggleSponsorOrg(id: string) {
    setSponsorPreview(null);
    setReviewConfirmed(false);
    setSelectedSponsorOrgIds((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  }

  function toggleSponsorContact(id: string) {
    setSponsorPreview(null);
    setReviewConfirmed(false);
    setSelectedSponsorContactIds((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  }

  function invalidateReview() {
    setReviewConfirmed(false);
  }

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => e.preventDefault()}
      aria-label="Kampagne erstellen"
    >
      <section
        aria-labelledby="kampagne-inhalt-heading"
        className="space-y-4 rounded-xl border border-[var(--border)] p-4 md:p-6"
      >
        {sectionHeading("kampagne-inhalt-heading", "Inhalt")}
        <p className="text-sm text-[var(--text-2)]">Titel und Nachricht Ihrer Kampagne.</p>
        {templateOptions.length > 0 ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="block flex-1 text-sm">
              <span className="mb-1 block font-medium text-[var(--foreground)]">Vorlage (optional)</span>
              <select
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2"
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
              >
                <option value="">Keine Vorlage</option>
                {templateOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={busy || !selectedTemplateId}
              onClick={() => void applyTemplate()}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium"
            >
              Vorlage übernehmen
            </button>
          </div>
        ) : null}
        {canManageTemplates ? (
          <p className="text-xs text-[var(--text-2)]">
            <Link href="/dashboard/communication/vorlagen" className="text-[var(--sce-primary)] hover:underline">
              Vorlagen verwalten
            </Link>
          </p>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-[var(--foreground)]">Interner Name</span>
            <input
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2"
              value={internalName}
              onChange={(e) => {
                setInternalName(e.target.value);
                invalidateReview();
              }}
              placeholder="z. B. Frühjahr 2026 — Mitgliederinfo"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 flex flex-wrap items-center justify-between gap-2 font-medium text-[var(--foreground)]">
              Betreff (Empfänger)
              {organisationContextRef ? (
                <PersonalisationFieldInsert
                  contextRef={organisationContextRef}
                  onInsert={(token) => insertPersonalisationToken(token, "subject")}
                />
              ) : null}
            </span>
            <input
              ref={subjectInputRef}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 font-mono text-sm"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                invalidateReview();
              }}
              placeholder="Titel der Kampagne"
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 flex items-center justify-between gap-2 font-medium text-[var(--foreground)]">
            Nachricht
            {organisationContextRef ? (
              <PersonalisationFieldInsert
                contextRef={organisationContextRef}
                onInsert={(token) => insertPersonalisationToken(token, "body")}
              />
            ) : null}
          </span>
          <textarea
            ref={bodyTextareaRef}
            className="min-h-[160px] w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 font-mono text-sm"
            value={bodyText}
            onChange={(e) => {
              setBodyText(e.target.value);
              invalidateReview();
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
      </section>

      <section
        aria-labelledby="kampagne-empfaenger-heading"
        className="space-y-4 rounded-xl border border-[var(--border)] p-4 md:p-6"
      >
        {sectionHeading("kampagne-empfaenger-heading", "Empfänger")}
        <p className="text-sm text-[var(--text-2)]">Zielgruppe der Kampagne.</p>
        <fieldset className="space-y-3">
          <legend className="sr-only">Zielgruppe wählen</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="audienceMode"
              checked={audienceMode !== "SPONSORS"}
              onChange={() => {
                setAudienceMode("WHOLE_ORG");
                invalidateReview();
              }}
            />
            Mitglieder / Verein
          </label>
          {sponsorOrganisations.length > 0 ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="audienceMode"
                checked={audienceMode === "SPONSORS"}
                onChange={() => {
                  setAudienceMode("SPONSORS");
                  invalidateReview();
                }}
              />
              Sponsoren / Partner
            </label>
          ) : null}
        </fieldset>
        {audienceMode !== "SPONSORS" ? (
          <CommunicationAudienceSelector
            context="CAMPAIGN"
            value={audienceSelection}
            onChange={(next) => {
              setAudienceSelection(next);
              invalidateReview();
            }}
            onPreviewChange={setAudiencePreview}
            requireLargeAudienceConfirm
            largeAudienceConfirmed={largeAudienceConfirmed}
            onLargeAudienceConfirmedChange={setLargeAudienceConfirmed}
            disabled={busy}
          />
        ) : null}
        {audienceMode === "SPONSORS" ? (
          <div className="space-y-3">
            <p className="text-xs text-[var(--text-2)]">{KAMPAGNE_SPONSOR_COMMERCIAL_NOTICE}</p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={sponsorMode === "ALL_ACTIVE"}
                onChange={() => {
                  setSponsorMode("ALL_ACTIVE");
                  invalidateReview();
                }}
              />
              Alle aktiven Sponsoren
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={sponsorMode === "SELECTED"}
                onChange={() => {
                  setSponsorMode("SELECTED");
                  invalidateReview();
                }}
              />
              Ausgewählte Sponsoren / Kontakte
            </label>
            {sponsorMode === "SELECTED" ? (
              <div className="space-y-2">
                {sponsorOrganisations.map((org) => (
                  <div key={org.id} className="rounded-lg border border-[var(--border)] p-3">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={selectedSponsorOrgIds.includes(org.id)}
                        onChange={() => toggleSponsorOrg(org.id)}
                      />
                      {org.name}
                    </label>
                    <div className="mt-2 flex flex-wrap gap-2 pl-6">
                      {org.contacts.map((contact) => (
                        <label
                          key={contact.id}
                          className="flex items-center gap-2 rounded border px-2 py-1 text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={selectedSponsorContactIds.includes(contact.id)}
                            onChange={() => toggleSponsorContact(contact.id)}
                          />
                          {contact.displayName}
                          {contact.isPrimary ? " (Hauptkontakt)" : ""}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        {audienceMode === "SPONSORS" && sponsorPreview ? (
          <p className="text-sm text-[var(--text-2)]">
            <strong>{sponsorPreview.effective}</strong> Personen in der Zielgruppe
            {sponsorPreview.excluded > 0 ? ` (${sponsorPreview.excluded} ausgeschlossen)` : ""}
            {sponsorPreview.sponsorAudience
              ? ` · Sponsor-Kontakte: ${sponsorPreview.sponsorAudience.sponsorContactCount}`
              : ""}
          </p>
        ) : null}
        <p className="text-xs text-[var(--text-2)]">{KAMPAGNE_PREFERENCES_NOTICE}</p>
        <p className="text-xs text-[var(--text-2)]">{KAMPAGNE_SAFEGUARDING_NOTICE}</p>
        {audienceMode === "SPONSORS" && sponsorPreview?.scopeNotice ? (
          <p className="text-xs text-[var(--text-2)]">{sponsorPreview.scopeNotice}</p>
        ) : null}
      </section>

      <section
        aria-labelledby="kampagne-kanaele-heading"
        className="space-y-3 rounded-xl border border-[var(--border)] p-4 md:p-6"
      >
        {sectionHeading("kampagne-kanaele-heading", "Kanäle")}
        <p className="text-sm text-[var(--text-2)]">Über welche Kanäle soll zugestellt werden?</p>
        <ul className="space-y-2 text-sm">
          <li>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={inAppEnabled}
                onChange={(e) => {
                  setInAppEnabled(e.target.checked);
                  invalidateReview();
                }}
              />
              In-App
            </label>
          </li>
          <li>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={pushEnabled}
                onChange={(e) => {
                  setPushEnabled(e.target.checked);
                  invalidateReview();
                }}
              />
              Push
            </label>
          </li>
          <li>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={emailChannelEnabled}
                onChange={(e) => {
                  setEmailChannelEnabled(e.target.checked);
                  invalidateReview();
                }}
              />
              E-Mail
            </label>
          </li>
        </ul>
        <CommunicationSenderSelector
          value={emailSenderIdentityId}
          onChange={(next) => {
            setEmailSenderIdentityId(next);
            invalidateReview();
          }}
          showOnlyWhenEmail
          emailChannelEnabled={emailChannelEnabled}
        />
        <p className="text-xs text-[var(--text-2)]">
          E-Mail-Versand bereit:{" "}
          {emailReady === null ? "…" : emailReady ? "Ja" : "Nein"}
          {emailReady === false ? (
            <>
              {" "}
              —{" "}
              <Link
                href="/dashboard/communication/email-sender"
                className="text-[var(--sce-primary)] hover:underline"
              >
                E-Mail-Absender prüfen
              </Link>
            </>
          ) : null}
        </p>
      </section>

      <section
        aria-labelledby="kampagne-zeitpunkt-heading"
        className="rounded-xl border border-[var(--border)] p-4 md:p-6"
      >
        {sectionHeading("kampagne-zeitpunkt-heading", "Zeitpunkt")}
        <div className="mt-4">
          <CommunicationScheduleFields
            tenantTimezone={tenantTimezone}
            scheduledAtLocal={scheduledAtLocal}
            onScheduledAtLocalChange={(value) => {
              setScheduledAtLocal(value);
              invalidateReview();
            }}
            scheduleEnabled={scheduleEnabled}
            onScheduleEnabledChange={(enabled) => {
              setScheduleEnabled(enabled);
              invalidateReview();
            }}
          />
        </div>
      </section>

      <section
        aria-labelledby="kampagne-review-heading"
        className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/30 p-4 md:p-6"
      >
        {sectionHeading("kampagne-review-heading", "Überprüfen")}
        <p className="text-sm text-[var(--text-2)]">Ist alles korrekt?</p>
        <dl className="grid gap-3 text-sm md:grid-cols-2">
          <div>
            <dt className="text-[var(--text-2)]">Interner Name</dt>
            <dd className="font-medium">{internalName.trim() || "—"}</dd>
          </div>
          <div>
            <dt className="text-[var(--text-2)]">Betreff</dt>
            <dd>{subject.trim() || "—"}</dd>
          </div>
          <div className="md:col-span-2">
            <dt className="text-[var(--text-2)]">Nachricht</dt>
            <dd className="whitespace-pre-wrap">{bodyText.trim() || "—"}</dd>
          </div>
          <div>
            <dt className="text-[var(--text-2)]">Zielgruppe</dt>
            <dd>{audienceSummaryLabel}</dd>
          </div>
          <div>
            <dt className="text-[var(--text-2)]">Zielpersonen (Vorschau)</dt>
            <dd>
              {audienceMode === "SPONSORS"
                ? sponsorPreview
                  ? `${sponsorPreview.effective} Personen`
                  : "Empfängervorschau wird berechnet …"
                : audiencePreview
                  ? `${audiencePreview.effective} Personen`
                  : "Empfängervorschau wird berechnet …"}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--text-2)]">Kanäle</dt>
            <dd>{channelSummary}</dd>
          </div>
          <div>
            <dt className="text-[var(--text-2)]">Zeitpunkt</dt>
            <dd>{timingSummary}</dd>
          </div>
          {audienceMode === "SPONSORS" ? (
            <div className="md:col-span-2">
              <dt className="text-[var(--text-2)]">Sponsor-Kontext</dt>
              <dd>Werbliche Kommunikation an Sponsor-Zielgruppe</dd>
            </div>
          ) : null}
        </dl>
        <p className="text-xs text-[var(--text-2)]">{KAMPAGNE_PUBLISH_NOTICE}</p>
        {organisationContextRef && audienceMode !== "SPONSORS" ? (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Personalisierungsvorschau</h3>
            <PersonalisationComposerPreview
              subject={subject}
              bodyText={bodyText}
              contextRef={organisationContextRef}
              audienceSelection={audienceSelection}
              audienceContext="CAMPAIGN"
              communicationKind="CAMPAIGN"
            />
          </div>
        ) : null}
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
          onClick={() => void handleAction("draft")}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium"
        >
          Entwurf speichern
        </button>
        {scheduleEnabled ? (
          <button
            type="button"
            disabled={busy || !scheduledAtLocal}
            onClick={() => void handleAction("schedule")}
            className="rounded-lg bg-[var(--sce-primary)] px-4 py-2 text-sm font-semibold text-white"
          >
            Kampagne planen
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleAction("publish")}
            className="rounded-lg bg-[var(--sce-primary)] px-4 py-2 text-sm font-semibold text-white"
          >
            Jetzt veröffentlichen
          </button>
        )}
        {canSaveAsTemplate && campaignId ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void saveAsTemplate(campaignId)}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm"
          >
            Als Vorlage speichern
          </button>
        ) : null}
      </div>
    </form>
  );
}
