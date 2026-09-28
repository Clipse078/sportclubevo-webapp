"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Circle, Loader2, Mail, AlertTriangle } from "lucide-react";
import AdminStatusPill from "@/components/admin/shared/AdminStatusPill";
import { CommunicationContentSurface } from "@/components/admin/communication/shared/CommunicationContentSurface";
import type { EmailSenderWorkspaceViewModel } from "@/lib/communication/email-sender-workspace";
import type { EmailSenderReadinessChecklistItem } from "@/lib/communication/email-sender-display";
import { useToast } from "@/hooks/use-toast";

type Props = {
  initialModel: EmailSenderWorkspaceViewModel;
};

const labelClass =
  "block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)] mb-1.5";

function checklistIcon(state: EmailSenderReadinessChecklistItem["state"]) {
  if (state === "pass") {
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--sce-success)]" aria-hidden />;
  }
  if (state === "fail") {
    return <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--sce-danger)]" aria-hidden />;
  }
  if (state === "warn") {
    return <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--sce-warning)]" aria-hidden />;
  }
  return <Circle className="h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden />;
}

function checklistStateLabel(state: EmailSenderReadinessChecklistItem["state"]): string {
  switch (state) {
    case "pass":
      return "Erfüllt";
    case "fail":
      return "Offen";
    case "warn":
      return "Hinweis";
    default:
      return "Neutral";
  }
}

function toneToPill(tone: EmailSenderWorkspaceViewModel["readinessPresentation"]["tone"]) {
  switch (tone) {
    case "success":
      return "success" as const;
    case "warning":
      return "warning" as const;
    case "danger":
      return "warning" as const;
    default:
      return "muted" as const;
  }
}

export default function EmailSenderWorkspace({ initialModel }: Props) {
  const { toast } = useToast();
  const [model, setModel] = useState(initialModel);
  const [displayName, setDisplayName] = useState(model.settings.displayName ?? "");
  const [emailAddress, setEmailAddress] = useState(model.settings.emailAddress ?? "");
  const [fieldErrors, setFieldErrors] = useState<{
    displayName?: string;
    emailAddress?: string;
  }>({});
  const [saving, setSaving] = useState(false);

  async function refreshReadinessAfterSave(settings: EmailSenderWorkspaceViewModel["settings"]) {
    const response = await fetch("/api/communication/email/readiness");
    if (!response.ok) {
      setModel((prev) => ({
        ...prev,
        settings,
      }));
      return;
    }
    const data = (await response.json()) as {
      readiness?: EmailSenderWorkspaceViewModel["readiness"];
      sender?: EmailSenderWorkspaceViewModel["settings"];
    };
    if (!data.readiness || !data.sender) {
      setModel((prev) => ({ ...prev, settings }));
      return;
    }

    const nextSettings = data.sender;
    const { buildEmailSenderReadinessPresentation, buildEmailSenderReplyToPresentation, parseFormattedEmailFrom } =
      await import("@/lib/communication/email-sender-display");

    const effective = parseFormattedEmailFrom(nextSettings.activeFrom);
    setModel((prev) => ({
      ...prev,
      settings: nextSettings,
      readiness: data.readiness!,
      readinessPresentation: buildEmailSenderReadinessPresentation(data.readiness!, nextSettings),
      effectiveSender: {
        displayName: effective.displayName,
        emailAddress: effective.emailAddress,
        formattedFrom: nextSettings.activeFrom,
        source: nextSettings.activeSource,
        usedForNewCommunicationEmail: data.readiness!.ready,
      },
      configuredSender: {
        displayName: nextSettings.displayName,
        emailAddress: nextSettings.emailAddress,
      },
      platformFallbackSender: nextSettings.platformFallbackActive ? effective : null,
      replyTo: buildEmailSenderReplyToPresentation({
        effectiveFrom: nextSettings.activeFrom,
        inboundReplyRoutingConfigured: prev.inboundReplyRoutingConfigured,
      }),
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFieldErrors({});
    setSaving(true);

    try {
      const response = await fetch("/api/admin/communications/email-sender", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, emailAddress }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        settings?: EmailSenderWorkspaceViewModel["settings"];
        error?: string;
        field?: "displayName" | "emailAddress";
      };

      if (!response.ok || !data.settings) {
        if (data.field) {
          setFieldErrors({ [data.field]: data.error ?? "Ungültiger Wert." });
        }
        toast.danger(data.error ?? "E-Mail-Absender konnte nicht gespeichert werden.");
        return;
      }

      setDisplayName(data.settings.displayName ?? "");
      setEmailAddress(data.settings.emailAddress ?? "");
      await refreshReadinessAfterSave(data.settings);
      toast.success("E-Mail-Absender gespeichert. Versandbereitschaft wurde neu bewertet.");
    } catch {
      toast.danger("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setSaving(false);
    }
  }

  const { readinessPresentation, effectiveSender, configuredSender, platformFallbackSender, replyTo } =
    model;

  return (
    <CommunicationContentSurface className="mx-auto w-full max-w-3xl space-y-6" padded={false}>
      <section
        aria-labelledby="email-sender-readiness-heading"
        className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 md:p-6"
        data-testid="email-sender-readiness"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2
              id="email-sender-readiness-heading"
              className="text-base font-semibold text-[var(--foreground)]"
            >
              Versandbereitschaft
            </h2>
            <p className="mt-1 text-sm text-[var(--text-2)]">{readinessPresentation.summary}</p>
          </div>
          <AdminStatusPill
            label={readinessPresentation.headline}
            tone={toneToPill(readinessPresentation.tone)}
          />
        </div>

        <ul
          className="mt-4 space-y-2"
          aria-label="Versandbereitschaft Prüfpunkte"
          data-testid="email-sender-readiness-checklist"
        >
          {readinessPresentation.checklist.map((item) => (
            <li key={item.id} className="flex gap-2 text-sm text-[var(--text-2)]">
              <span className="sr-only">{checklistStateLabel(item.state)}:</span>
              {checklistIcon(item.state)}
              <span>
                <span className="font-medium text-[var(--foreground)]">{item.label}</span>
                {item.detail ? <span className="block text-[var(--text-2)]">{item.detail}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="email-sender-active-heading"
        className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 md:p-6"
        data-testid="email-sender-active"
      >
        <h2 id="email-sender-active-heading" className="text-base font-semibold text-[var(--foreground)]">
          Aktiver Absender
        </h2>
        <p className="mt-1 text-sm text-[var(--text-2)]">
          {effectiveSender.usedForNewCommunicationEmail
            ? "Dieser Absender wird für neue Kommunikations-E-Mails verwendet."
            : "Der Versand ist derzeit nicht vollständig bereit; unten sehen Sie den effektiv vorgesehenen Absender."}
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <p className={labelClass}>Aktiv verwendet</p>
            <p className="font-semibold text-[var(--foreground)]">{effectiveSender.displayName}</p>
            <p className="mt-0.5 break-all text-sm text-[var(--text-2)]">{effectiveSender.emailAddress}</p>
            <p className="mt-2 text-xs text-[var(--muted)]">
              Quelle:{" "}
              {effectiveSender.source === "TENANT" ? "Vereinskonfiguration" : "SportClubEvo-Fallback"}
            </p>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <p className={labelClass}>Konfigurierter Absender</p>
            {configuredSender.displayName && configuredSender.emailAddress ? (
              <>
                <p className="font-semibold text-[var(--foreground)]">{configuredSender.displayName}</p>
                <p className="mt-0.5 break-all text-sm text-[var(--text-2)]">
                  {configuredSender.emailAddress}
                </p>
              </>
            ) : (
              <p className="text-sm text-[var(--text-2)]">Noch kein Vereinsabsender hinterlegt.</p>
            )}
            {model.settings.platformFallbackActive && platformFallbackSender ? (
              <p className="mt-3 text-xs text-[var(--muted)]">
                Fallback aktiv — effektiv wird{" "}
                <span className="font-medium text-[var(--foreground)]">
                  {platformFallbackSender.displayName}
                </span>{" "}
                ({platformFallbackSender.emailAddress}) genutzt, bis der Vereinsabsender bereit ist.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section
        aria-labelledby="email-sender-config-heading"
        className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 md:p-6"
      >
        <h2 id="email-sender-config-heading" className="text-base font-semibold text-[var(--foreground)]">
          Absender konfigurieren
        </h2>
        <p className="mt-1 text-sm text-[var(--text-2)]">
          Name und Adresse für Communication-E-Mails (Mitteilungen, Kampagnen, Direktnachrichten per E-Mail).
        </p>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-4 space-y-5"
          data-testid="email-sender-form"
        >
          <div>
            <label htmlFor="email-sender-display-name" className={labelClass}>
              Absendername
            </label>
            <input
              id="email-sender-display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={120}
              autoComplete="organization"
              placeholder="FC Allschwil"
              disabled={saving}
              aria-invalid={!!fieldErrors.displayName}
              aria-describedby={
                fieldErrors.displayName ? "email-sender-display-name-error" : undefined
              }
              className="fca-input w-full"
            />
            {fieldErrors.displayName ? (
              <p
                id="email-sender-display-name-error"
                role="alert"
                className="mt-1 text-[11px] font-medium text-[var(--sce-danger)]"
              >
                {fieldErrors.displayName}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="email-sender-address" className={labelClass}>
              Absender-E-Mail-Adresse
            </label>
            <input
              id="email-sender-address"
              type="email"
              value={emailAddress}
              onChange={(event) => setEmailAddress(event.target.value)}
              maxLength={320}
              autoComplete="email"
              placeholder="kommunikation@fcallschwil.ch"
              disabled={saving}
              aria-invalid={!!fieldErrors.emailAddress}
              aria-describedby={fieldErrors.emailAddress ? "email-sender-address-error" : undefined}
              className="fca-input w-full"
            />
            {fieldErrors.emailAddress ? (
              <p
                id="email-sender-address-error"
                role="alert"
                className="mt-1 text-[11px] font-medium text-[var(--sce-danger)]"
              >
                {fieldErrors.emailAddress}
              </p>
            ) : null}
          </div>

          <div className="flex justify-end border-t border-[var(--border)] pt-4">
            <button type="submit" disabled={saving} className="fca-button-primary">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {saving ? "Speichern…" : "Absender speichern"}
            </button>
          </div>
        </form>
      </section>

      <section
        aria-labelledby="email-sender-replyto-heading"
        className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 md:p-6"
        data-testid="email-sender-reply-to"
      >
        <h2 id="email-sender-replyto-heading" className="text-base font-semibold text-[var(--foreground)]">
          Reply-To
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <div className="flex items-center gap-2 text-[var(--muted)]">
              <Mail className="h-4 w-4" aria-hidden />
              <p className={labelClass}>From (sichtbarer Absender)</p>
            </div>
            <p className="mt-2 font-semibold text-[var(--foreground)]">{replyTo.fromDisplayName}</p>
            <p className="break-all text-sm text-[var(--text-2)]">{replyTo.fromEmailAddress}</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <p className={labelClass}>{replyTo.replyToHeadline}</p>
            <p className="mt-2 text-sm leading-5 text-[var(--text-2)]">{replyTo.replyToBody}</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-[var(--text-2)]">{replyTo.broadcastNote}</p>
        <p className="mt-2 text-sm text-[var(--text-2)]">{replyTo.informOnlyNote}</p>
        <p className="mt-3 text-sm">
          <Link
            href={replyTo.communicationCenterHref}
            className="font-medium text-[var(--sce-primary)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
          >
            {replyTo.communicationCenterLinkLabel}
          </Link>
        </p>
      </section>

      <section
        aria-labelledby="email-sender-help-heading"
        className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 md:p-6"
        data-testid="email-sender-help"
      >
        <h2 id="email-sender-help-heading" className="text-base font-semibold text-[var(--foreground)]">
          Technische Hinweise
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--text-2)]">
          <li>
            Communication-E-Mails nutzen die zentrale Versandarchitektur (COMM-14) über den konfigurierten
            Versanddienst — nicht das separate Rechnungs-/Billing-SMTP.
          </li>
          <li>
            «Gesendet» bedeutet, dass der Versanddienst die Nachricht angenommen hat — nicht automatisch
            Zustellung ins Postfach oder gelesen.
          </li>
          <li>
            Mitteilungen, Kampagnen und Vorlagen teilen dieselbe Absender- und Bereitschaftsprüfung; Vorlagen
            garantieren keine Versandbereitschaft.
          </li>
          <li>API-Schlüssel und Provider-Passwörter werden hier nicht angezeigt.</li>
        </ul>
      </section>
    </CommunicationContentSurface>
  );
}
