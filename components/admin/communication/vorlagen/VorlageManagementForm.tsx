"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PLATFORM_COMMUNICATION_TEMPLATE_KINDS } from "@/lib/communication/templates/platform-template-constants";
import {
  VORLAGEN_CHANNEL_DEFAULTS_NOTICE,
  VORLAGEN_EDIT_FUTURE_NOTICE,
  VORLAGEN_SCHEDULING_BOUNDARY_NOTICE,
  formatVorlageChannelDefaults,
  vorlageApplicabilityLabel,
  vorlageKindLabel,
  vorlageStatusLabel,
} from "@/lib/communication/templates/vorlagen-display";
import { inferKampagnenAudienceEditorState } from "@/lib/communication/campaign/kampagnen-audience-editor";
import { inferMitteilungAudienceEditorState } from "@/lib/communication/club/mitteilungen-audience-editor";
import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";
import {
  defaultCampaignOrchestrationMeta,
  type CampaignOrchestrationMeta,
} from "@/lib/communication/campaign/campaign-orchestration-meta";

type TargetGroupOption = { id: string; name: string; status: string };

type SponsorOrgOption = {
  id: string;
  name: string;
  contacts: { id: string; firstName: string; lastName: string; isPrimary: boolean }[];
};

type DefaultValues = {
  name: string;
  description: string;
  kind: string;
  status: string;
  internalName: string;
  subject: string;
  bodyText: string;
  audienceSpec?: CommunicationAudienceSpec | null;
  orchestration?: CampaignOrchestrationMeta;
};

type Props = {
  mode: "create" | "edit";
  templateId?: string;
  defaultValues?: Partial<DefaultValues>;
  targetGroups: TargetGroupOption[];
  sponsorOrganisations?: SponsorOrgOption[];
  canManage?: boolean;
  startEditing?: boolean;
};

const STEPS = [
  { id: "basics", label: "Grundlagen" },
  { id: "content", label: "Inhalt" },
  { id: "defaults", label: "Standardwerte" },
  { id: "review", label: "Vorschau / Überprüfen" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Entwurf" },
  { value: "ACTIVE", label: "Aktiv" },
] as const;

const labelClass =
  "block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)] mb-1.5";

const KIND_OPTIONS = PLATFORM_COMMUNICATION_TEMPLATE_KINDS.map((kind) => ({
  value: kind,
  label: vorlageKindLabel(kind),
  applicability: vorlageApplicabilityLabel(kind),
}));

export default function VorlageManagementForm({
  mode,
  templateId,
  defaultValues,
  targetGroups,
  sponsorOrganisations = [],
  canManage = true,
  startEditing = true,
}: Props) {
  const router = useRouter();
  const initialAudience = defaultValues?.audienceSpec ?? null;
  const isCampaignInitial = (defaultValues?.kind ?? "CAMPAIGN") === "CAMPAIGN";
  const campaignAudience = initialAudience
    ? inferKampagnenAudienceEditorState(initialAudience)
    : { mode: "WHOLE_ORG" as const, selectedGroupIds: [] as string[], sponsorMode: "ALL_ACTIVE" as const, sponsorOrganisationIds: [] as string[], sponsorContactIds: [] as string[] };
  const mitteilungAudience = initialAudience
    ? inferMitteilungAudienceEditorState(initialAudience)
    : { mode: "WHOLE_ORG" as const, selectedGroupIds: [] as string[] };

  const [step, setStep] = useState<StepId>("basics");
  const [editing, setEditing] = useState(startEditing);
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [description, setDescription] = useState(defaultValues?.description ?? "");
  const [kind, setKind] = useState(defaultValues?.kind ?? "ANNOUNCEMENT");
  const [status, setStatus] = useState(defaultValues?.status ?? "DRAFT");
  const [internalName, setInternalName] = useState(defaultValues?.internalName ?? "");
  const [subject, setSubject] = useState(defaultValues?.subject ?? "");
  const [bodyText, setBodyText] = useState(defaultValues?.bodyText ?? "");
  const [audienceMode, setAudienceMode] = useState(
    isCampaignInitial ? campaignAudience.mode : mitteilungAudience.mode,
  );
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(
    isCampaignInitial ? campaignAudience.selectedGroupIds : mitteilungAudience.selectedGroupIds,
  );
  const [sponsorMode, setSponsorMode] = useState<"ALL_ACTIVE" | "SELECTED">(
    campaignAudience.sponsorMode,
  );
  const [selectedSponsorOrgIds, setSelectedSponsorOrgIds] = useState<string[]>(
    campaignAudience.sponsorOrganisationIds,
  );
  const orchestrationInitial =
    defaultValues?.orchestration ?? defaultCampaignOrchestrationMeta();
  const [inAppEnabled, setInAppEnabled] = useState(orchestrationInitial.channels.inApp);
  const [pushEnabled, setPushEnabled] = useState(orchestrationInitial.channels.push);
  const [emailEnabled, setEmailEnabled] = useState(orchestrationInitial.channels.email);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readOnly = !canManage || !editing;
  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const isCampaign = kind === "CAMPAIGN";

  const applicability = vorlageApplicabilityLabel(kind);

  function buildAudienceSpec(): CommunicationAudienceSpec {
    if (isCampaign && audienceMode === "SPONSORS") {
      if (sponsorMode === "ALL_ACTIVE") {
        return { composition: "UNION", components: [{ sponsor: { allActiveSponsors: true } }] };
      }
      return {
        composition: "UNION",
        components: [
          {
            sponsor: {
              sponsorOrganisationIds: selectedSponsorOrgIds,
              sponsorContactIds: [],
            },
          },
        ],
      };
    }
    if (audienceMode === "TARGET_GROUPS") {
      return {
        composition: "UNION",
        components: selectedGroupIds.map((id) => ({ savedTargetGroupIds: [id] })),
      };
    }
    return {
      composition: "UNION",
      components: [{ structural: { wholeOrganisation: true } }],
    };
  }

  function buildOrchestration(): CampaignOrchestrationMeta {
    return {
      schemaVersion: 1,
      channels: { inApp: inAppEnabled, push: pushEnabled, email: emailEnabled },
      scheduling: { mode: "IMMEDIATE", scheduledAt: null, timezone: null },
    };
  }

  const audienceSummaryLabel = useMemo(() => {
    if (isCampaign && audienceMode === "SPONSORS") {
      if (sponsorMode === "ALL_ACTIVE") return "Alle aktiven Sponsoren / Partner";
      const names = selectedSponsorOrgIds
        .map((id) => sponsorOrganisations.find((o) => o.id === id)?.name)
        .filter(Boolean);
      return names.length > 0 ? names.join(", ") : "Ausgewählte Sponsoren";
    }
    if (audienceMode === "WHOLE_ORG") return "Ganzer Verein";
    if (selectedGroupIds.length === 0) return "Keine Zielgruppe ausgewählt";
    const names = selectedGroupIds
      .map((id) => targetGroups.find((tg) => tg.id === id)?.name)
      .filter(Boolean);
    return names.length > 0 ? names.join(", ") : `${selectedGroupIds.length} Zielgruppe(n)`;
  }, [
    audienceMode,
    isCampaign,
    selectedGroupIds,
    selectedSponsorOrgIds,
    sponsorMode,
    sponsorOrganisations,
    targetGroups,
  ]);

  const channelSummary = formatVorlageChannelDefaults(buildOrchestration());

  function validateBasics(): string | null {
    if (!name.trim()) return "Name ist erforderlich.";
    return null;
  }

  function validateContent(): string | null {
    if (!bodyText.trim()) return "Inhalt ist erforderlich.";
    return null;
  }

  function validateDefaults(): string | null {
    if (audienceMode === "TARGET_GROUPS" && selectedGroupIds.length === 0) {
      return "Bitte mindestens eine Zielgruppe wählen oder „Ganzer Verein“.";
    }
    if (isCampaign && audienceMode === "SPONSORS" && sponsorMode === "SELECTED" && selectedSponsorOrgIds.length === 0) {
      return "Bitte mindestens einen Sponsor auswählen.";
    }
    if (!inAppEnabled && !pushEnabled && !emailEnabled) {
      return "Mindestens ein Kanal-Default muss aktiv sein.";
    }
    return null;
  }

  function goNext() {
    setError(null);
    if (step === "basics") {
      const err = validateBasics();
      if (err) {
        setError(err);
        return;
      }
      setStep("content");
      return;
    }
    if (step === "content") {
      const err = validateContent();
      if (err) {
        setError(err);
        return;
      }
      setStep("defaults");
      return;
    }
    if (step === "defaults") {
      const err = validateDefaults();
      if (err) {
        setError(err);
        return;
      }
      setStep("review");
    }
  }

  function goBack() {
    setError(null);
    if (step === "content") setStep("basics");
    else if (step === "defaults") setStep("content");
    else if (step === "review") setStep("defaults");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    for (const [validator, targetStep] of [
      [validateBasics, "basics"],
      [validateContent, "content"],
      [validateDefaults, "defaults"],
    ] as const) {
      const err = validator();
      if (err) {
        setError(err);
        setStep(targetStep);
        return;
      }
    }
    setLoading(true);
    setError(null);
    try {
      const payload = {
        name,
        description: description || null,
        kind,
        status,
        internalName: isCampaign ? internalName || null : null,
        subject: subject || null,
        bodyText,
        audienceSpec: buildAudienceSpec(),
        orchestration: buildOrchestration(),
      };
      const res =
        mode === "edit" && templateId
          ? await fetch(`/api/communication/templates/${templateId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch("/api/communication/templates", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Speichern fehlgeschlagen");
      const id = (data.id as string) ?? templateId;
      router.push(id ? `/dashboard/communication/vorlagen/${id}` : "/dashboard/communication/vorlagen");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  if (mode === "edit" && !editing) {
    return (
      <div className="flex justify-end">
        <button
          type="button"
          className="fca-button-primary"
          onClick={() => {
            setEditing(true);
            setStep("basics");
          }}
        >
          Vorlage bearbeiten
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="sce-form-card space-y-6" noValidate>
      <p className="text-sm text-[var(--text-2)]">{VORLAGEN_EDIT_FUTURE_NOTICE}</p>

      <nav aria-label="Vorlage — Schritte">
        <ol className="flex flex-wrap gap-2">
          {STEPS.map((s, index) => {
            const active = s.id === step;
            const done = index < stepIndex;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  className={`rounded-full px-3 py-1 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)] ${
                    active
                      ? "bg-[var(--sce-primary)] text-white"
                      : done
                        ? "bg-[var(--surface-3)] text-[var(--foreground)]"
                        : "border border-[var(--border)] text-[var(--muted)]"
                  }`}
                  aria-current={active ? "step" : undefined}
                  onClick={() => {
                    if (index <= stepIndex) setStep(s.id);
                  }}
                >
                  {index + 1}. {s.label}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {step === "basics" ? (
        <div className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="vl-name">
                Name *
              </label>
              <input
                id="vl-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={readOnly}
                className="fca-input"
                aria-invalid={Boolean(error && !name.trim())}
              />
            </div>
            {mode === "edit" ? (
              <div>
                <label className={labelClass} htmlFor="vl-status">
                  Status
                </label>
                <select
                  id="vl-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={readOnly}
                  className="fca-select"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className={labelClass} htmlFor="vl-kind">
                  Vorlagentyp *
                </label>
                <select
                  id="vl-kind"
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                  disabled={readOnly}
                  className="fca-select"
                  aria-describedby="vl-kind-hint"
                >
                  {KIND_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p id="vl-kind-hint" className="mt-2 text-sm text-[var(--text-2)]">
                  Geeignet für: <strong>{applicability}</strong>
                </p>
              </div>
            )}
          </div>
          {mode === "edit" ? (
            <p className="text-sm text-[var(--text-2)]">
              Geeignet für: <strong>{applicability}</strong> ({vorlageKindLabel(kind)})
            </p>
          ) : null}
          <div>
            <label className={labelClass} htmlFor="vl-description">
              Beschreibung
            </label>
            <textarea
              id="vl-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={readOnly}
              className="fca-input resize-none"
            />
          </div>
        </div>
      ) : null}

      {step === "content" ? (
        <div className="space-y-5">
          {isCampaign ? (
            <div>
              <label className={labelClass} htmlFor="vl-internal">
                Interner Kampagnenname
              </label>
              <input
                id="vl-internal"
                type="text"
                value={internalName}
                onChange={(e) => setInternalName(e.target.value)}
                disabled={readOnly}
                className="fca-input"
              />
            </div>
          ) : null}
          <div>
            <label className={labelClass} htmlFor="vl-subject">
              Betreff
            </label>
            <input
              id="vl-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={readOnly}
              className="fca-input"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="vl-body">
              Nachricht *
            </label>
            <textarea
              id="vl-body"
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              rows={8}
              required
              disabled={readOnly}
              className="fca-input resize-y min-h-[160px]"
              aria-invalid={Boolean(error && !bodyText.trim())}
            />
          </div>
        </div>
      ) : null}

      {step === "defaults" ? (
        <div className="space-y-6">
          <fieldset className="space-y-3">
            <legend className={labelClass}>Standard-Zielgruppe</legend>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="audienceMode"
                  checked={audienceMode === "WHOLE_ORG"}
                  onChange={() => setAudienceMode("WHOLE_ORG")}
                  disabled={readOnly}
                />
                Ganzer Verein
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="audienceMode"
                  checked={audienceMode === "TARGET_GROUPS"}
                  onChange={() => setAudienceMode("TARGET_GROUPS")}
                  disabled={readOnly}
                />
                Gespeicherte Zielgruppen
              </label>
              {isCampaign && sponsorOrganisations.length > 0 ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="audienceMode"
                    checked={audienceMode === "SPONSORS"}
                    onChange={() => setAudienceMode("SPONSORS")}
                    disabled={readOnly}
                  />
                  Sponsoren / Partner
                </label>
              ) : null}
            </div>
            {audienceMode === "TARGET_GROUPS" ? (
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-[var(--border)] p-3">
                {targetGroups.map((tg) => (
                  <label key={tg.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedGroupIds.includes(tg.id)}
                      onChange={(e) => {
                        setSelectedGroupIds((prev) =>
                          e.target.checked ? [...prev, tg.id] : prev.filter((id) => id !== tg.id),
                        );
                      }}
                      disabled={readOnly || tg.status !== "ACTIVE"}
                    />
                    {tg.name}
                    {tg.status !== "ACTIVE" ? (
                      <span className="text-xs text-[var(--muted)]">(archiviert)</span>
                    ) : null}
                  </label>
                ))}
              </div>
            ) : null}
            {isCampaign && audienceMode === "SPONSORS" ? (
              <div className="space-y-2">
                <select
                  className="fca-select"
                  value={sponsorMode}
                  onChange={(e) => setSponsorMode(e.target.value as "ALL_ACTIVE" | "SELECTED")}
                  disabled={readOnly}
                  aria-label="Sponsor-Auswahlmodus"
                >
                  <option value="ALL_ACTIVE">Alle aktiven Sponsoren</option>
                  <option value="SELECTED">Ausgewählte Organisationen</option>
                </select>
                {sponsorMode === "SELECTED" ? (
                  <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-[var(--border)] p-3">
                    {sponsorOrganisations.map((org) => (
                      <label key={org.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedSponsorOrgIds.includes(org.id)}
                          onChange={(e) => {
                            setSelectedSponsorOrgIds((prev) =>
                              e.target.checked ? [...prev, org.id] : prev.filter((id) => id !== org.id),
                            );
                          }}
                          disabled={readOnly}
                        />
                        {org.name}
                      </label>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </fieldset>

          <fieldset className="space-y-3">
            <legend className={labelClass}>Standard-Kanäle</legend>
            <p className="text-xs text-[var(--text-2)]">{VORLAGEN_CHANNEL_DEFAULTS_NOTICE}</p>
            <p className="text-xs text-[var(--text-2)]">{VORLAGEN_SCHEDULING_BOUNDARY_NOTICE}</p>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={inAppEnabled}
                  onChange={(e) => setInAppEnabled(e.target.checked)}
                  disabled={readOnly}
                />
                In-App
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={pushEnabled}
                  onChange={(e) => setPushEnabled(e.target.checked)}
                  disabled={readOnly}
                />
                Push
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={emailEnabled}
                  onChange={(e) => setEmailEnabled(e.target.checked)}
                  disabled={readOnly}
                />
                E-Mail
              </label>
            </div>
          </fieldset>
        </div>
      ) : null}

      {step === "review" ? (
        <div className="space-y-4" aria-live="polite">
          <h2 className="text-base font-semibold">Vorschau</h2>
          <dl className="grid gap-3 text-sm md:grid-cols-2">
            <div>
              <dt className="text-[var(--muted)]">Name</dt>
              <dd className="font-medium">{name}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Typ</dt>
              <dd>{vorlageKindLabel(kind)} — {applicability}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Status</dt>
              <dd>{vorlageStatusLabel(status)}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Zielgruppe (Default)</dt>
              <dd>{audienceSummaryLabel}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Kanäle (Default)</dt>
              <dd>{channelSummary}</dd>
            </div>
          </dl>
          {subject ? (
            <div>
              <p className="text-xs font-semibold uppercase text-[var(--muted)]">Betreff</p>
              <p className="text-sm">{subject}</p>
            </div>
          ) : null}
          <div>
            <p className="text-xs font-semibold uppercase text-[var(--muted)]">Nachricht</p>
            <p className="whitespace-pre-wrap text-sm">{bodyText}</p>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {step !== "basics" ? (
          <button type="button" className="fca-button-secondary" onClick={goBack} disabled={loading}>
            Zurück
          </button>
        ) : null}
        {step !== "review" ? (
          <button type="button" className="fca-button-primary" onClick={goNext} disabled={readOnly}>
            Weiter
          </button>
        ) : (
          <button type="submit" className="fca-button-primary inline-flex items-center gap-2" disabled={loading || readOnly}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Speichern
          </button>
        )}
      </div>
    </form>
  );
}
