import {
  getTenantEmailSenderSettings,
  type TenantEmailSenderSettings,
} from "@/lib/communication/email-sender-service";
import {
  buildEmailSenderReadinessPresentation,
  buildEmailSenderReplyToPresentation,
  parseFormattedEmailFrom,
  type EmailSenderReadinessPresentation,
  type EmailSenderReplyToPresentation,
} from "@/lib/communication/email-sender-display";
import {
  evaluatePlatformEmailReadiness,
  type PlatformEmailReadiness,
} from "@/lib/communication/platform-email/email-readiness-service";
import { isExternalSideEffectConfigured } from "@/lib/server/external-side-effect-policy";

export type EmailSenderWorkspaceViewModel = {
  settings: TenantEmailSenderSettings;
  readiness: PlatformEmailReadiness;
  readinessPresentation: EmailSenderReadinessPresentation;
  effectiveSender: {
    displayName: string;
    emailAddress: string;
    formattedFrom: string;
    source: TenantEmailSenderSettings["activeSource"];
    usedForNewCommunicationEmail: boolean;
  };
  configuredSender: {
    displayName: string | null;
    emailAddress: string | null;
  };
  platformFallbackSender: ParsedEmailFromIdentity | null;
  replyTo: EmailSenderReplyToPresentation;
  inboundReplyRoutingConfigured: boolean;
};

type ParsedEmailFromIdentity = ReturnType<typeof parseFormattedEmailFrom>;

function inboundReplyRoutingConfigured(): boolean {
  return isExternalSideEffectConfigured("inbound-email", ["EMAIL_INBOUND_DOMAIN"]);
}

export async function loadEmailSenderWorkspaceViewModel(
  tenantId: string,
): Promise<EmailSenderWorkspaceViewModel> {
  const [settings, readiness] = await Promise.all([
    getTenantEmailSenderSettings(tenantId),
    evaluatePlatformEmailReadiness(tenantId),
  ]);

  const effective = parseFormattedEmailFrom(settings.activeFrom);
  const inboundConfigured = inboundReplyRoutingConfigured();

  const platformFallbackSender = settings.platformFallbackActive ? effective : null;

  return {
    settings,
    readiness,
    readinessPresentation: buildEmailSenderReadinessPresentation(readiness, settings),
    effectiveSender: {
      displayName: effective.displayName,
      emailAddress: effective.emailAddress,
      formattedFrom: settings.activeFrom,
      source: settings.activeSource,
      usedForNewCommunicationEmail: readiness.ready,
    },
    configuredSender: {
      displayName: settings.displayName,
      emailAddress: settings.emailAddress,
    },
    platformFallbackSender,
    replyTo: buildEmailSenderReplyToPresentation({
      effectiveFrom: settings.activeFrom,
      inboundReplyRoutingConfigured: inboundConfigured,
    }),
    inboundReplyRoutingConfigured: inboundConfigured,
  };
}
