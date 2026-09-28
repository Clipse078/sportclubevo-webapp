import type { TenantEmailSenderSettings } from "@/lib/communication/email-sender-service";
import type { PlatformEmailReadiness } from "@/lib/communication/platform-email/email-readiness-service";

export const EMAIL_SENDER_WORKSPACE_DESCRIPTION =
  "Absender und Zustellbereitschaft für E-Mails aus der Kommunikation verwalten.";

export type EmailSenderReadinessTone = "success" | "warning" | "danger" | "muted";

export type EmailSenderReadinessChecklistItem = {
  id: string;
  label: string;
  state: "pass" | "fail" | "warn" | "neutral";
  detail?: string;
};

export type EmailSenderReadinessPresentation = {
  headline: string;
  tone: EmailSenderReadinessTone;
  summary: string;
  checklist: EmailSenderReadinessChecklistItem[];
};

export type ParsedEmailFromIdentity = {
  displayName: string;
  emailAddress: string;
};

export function parseFormattedEmailFrom(from: string): ParsedEmailFromIdentity {
  const trimmed = from.trim();
  const match = trimmed.match(/^\s*(.*?)\s*<([^<>]+)>\s*$/);
  if (match) {
    const emailAddress = match[2]!.trim().toLowerCase();
    const displayName = match[1]?.trim() || emailAddress;
    return { displayName, emailAddress };
  }
  return { displayName: trimmed, emailAddress: trimmed.toLowerCase() };
}

export function buildEmailSenderReadinessPresentation(
  readiness: PlatformEmailReadiness,
  settings: TenantEmailSenderSettings,
): EmailSenderReadinessPresentation {
  const checklist: EmailSenderReadinessChecklistItem[] = [
    {
      id: "transport",
      label: "Versanddienst konfiguriert",
      state: readiness.transportConfigured ? "pass" : "fail",
      detail: readiness.transportConfigured
        ? undefined
        : "Der Communication-Versanddienst ist auf dieser Umgebung nicht vollständig konfiguriert.",
    },
    {
      id: "sender-address",
      label: "Vereinsabsender hinterlegt",
      state: readiness.senderConfigured ? "pass" : "warn",
      detail: readiness.senderConfigured
        ? undefined
        : "Name und Adresse können unten konfiguriert werden.",
    },
    {
      id: "verification",
      label: "Absenderadresse freigegeben",
      state:
        settings.providerStatus === "VERIFIED"
          ? "pass"
          : settings.providerStatus === "NOT_CONFIGURED"
            ? "neutral"
            : settings.providerStatus === "UNKNOWN"
              ? "warn"
              : "fail",
      detail:
        settings.providerStatus === "NOT_VERIFIED"
          ? "Die Domain der konfigurierten Adresse ist noch nicht für den Versand freigegeben."
          : settings.providerStatus === "UNKNOWN"
            ? "Die Freigabe konnte nicht bestätigt werden."
            : undefined,
    },
    {
      id: "effective-from",
      label: "Gültige Absenderadresse für den Versand",
      state: readiness.fromAddressValid ? "pass" : "fail",
    },
  ];

  if (readiness.platformFallbackActive && readiness.transportConfigured) {
    checklist.push({
      id: "fallback",
      label: "Plattform-Fallback verfügbar",
      state: "warn",
      detail: "Es wird vorübergehend der SportClubEvo-Standardabsender verwendet.",
    });
  }

  if (!readiness.transportConfigured) {
    return {
      headline: "Provider nicht konfiguriert",
      tone: "danger",
      summary:
        "E-Mail-Versand aus der Kommunikation ist derzeit nicht möglich, weil der Versanddienst nicht konfiguriert ist.",
      checklist,
    };
  }

  if (readiness.ready && !readiness.platformFallbackActive) {
    return {
      headline: "Bereit",
      tone: "success",
      summary:
        "Der konfigurierte Vereinsabsender ist freigegeben. Neue Kommunikations-E-Mails können versendet werden.",
      checklist,
    };
  }

  if (readiness.ready && readiness.platformFallbackActive) {
    return {
      headline: "Fallback aktiv",
      tone: "warning",
      summary:
        "E-Mails können versendet werden, verwenden aber den SportClubEvo-Standardabsender, bis der Vereinsabsender freigegeben ist.",
      checklist,
    };
  }

  if (
    readiness.senderConfigured &&
    settings.providerStatus === "NOT_VERIFIED"
  ) {
    return {
      headline: "Absender nicht verifiziert",
      tone: "warning",
      summary:
        "Der Vereinsabsender ist hinterlegt, aber die Absenderdomain ist noch nicht freigegeben. Der Standardabsender wird verwendet.",
      checklist,
    };
  }

  if (!readiness.senderConfigured) {
    return {
      headline: "Konfiguration unvollständig",
      tone: "warning",
      summary:
        "Es ist noch kein vollständiger Vereinsabsender hinterlegt. Der SportClubEvo-Standardabsender wird verwendet.",
      checklist,
    };
  }

  return {
    headline: "Konfiguration unvollständig",
    tone: "warning",
    summary: "Der E-Mail-Versand ist noch nicht vollständig einsatzbereit.",
    checklist,
  };
}

export type EmailSenderReplyToPresentation = {
  fromDisplayName: string;
  fromEmailAddress: string;
  replyToHeadline: string;
  replyToBody: string;
  communicationCenterLinkLabel: string;
  communicationCenterHref: string;
  broadcastNote: string;
  informOnlyNote: string;
};

export function buildEmailSenderReplyToPresentation(input: {
  effectiveFrom: string;
  inboundReplyRoutingConfigured: boolean;
}): EmailSenderReplyToPresentation {
  const from = parseFormattedEmailFrom(input.effectiveFrom);

  const replyToHeadline = "Reply-To (Antworten)";
  const replyToBody = input.inboundReplyRoutingConfigured
    ? "From ist die sichtbare Absenderadresse. Bei thread-fähigen E-Mails aus dem Kommunikationscenter leitet Reply-To Antworten in den zugehörigen Vorgang — unabhängig von Mitteilungen und Kampagnen."
    : "From ist die sichtbare Absenderadresse. Reply-To-Routing für eingehende Antworten ist auf dieser Umgebung nicht aktiv; Antworten in E-Mail-Programmen gehen an die From-Adresse.";

  return {
    fromDisplayName: from.displayName,
    fromEmailAddress: from.emailAddress,
    replyToHeadline,
    replyToBody,
    communicationCenterLinkLabel: "Kommunikationscenter-Einstellungen",
    communicationCenterHref: "/dashboard/communication/inbox/settings",
    broadcastNote:
      "Mitteilungen und Kampagnen setzen kein separates Reply-To. Empfänger antworten in der Regel direkt an die angezeigte Absenderadresse.",
    informOnlyNote:
      "Bei «Nur informieren» sind Antworten in SportClubEvo deaktiviert. Empfänger können dennoch eine neue E-Mail an die sichtbare Adresse senden.",
  };
}
