import {
  FileStack,
  Mail,
  Send,
  SlidersHorizontal,
  UsersRound,
} from "lucide-react";
import type { CommunicationHubCapabilityAccess } from "@/lib/communication/hub-access";
import { CommunicationHubCapabilityLink } from "./CommunicationHubCapabilityLink";
import { CommunicationHubInboxSection } from "./CommunicationHubInboxSection";

type CommunicationHubViewProps = {
  access: CommunicationHubCapabilityAccess;
};

function HubSectionHeading({ id, title }: { id: string; title: string }) {
  return (
    <h2
      id={id}
      className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]"
    >
      {title}
    </h2>
  );
}

export function CommunicationHubView({ access }: CommunicationHubViewProps) {
  const showCommunication = access.mitteilungen || access.kampagnen;
  const showOrganisation = access.zielgruppen || access.vorlagen;

  return (
    <div className="space-y-8">
      {access.inbox ? (
        <CommunicationHubInboxSection href="/dashboard/communication/inbox" />
      ) : null}

      {showCommunication ? (
        <section aria-labelledby="communication-hub-comm-heading" className="space-y-3">
          <HubSectionHeading id="communication-hub-comm-heading" title="Kommunikation" />
          <div className="grid gap-3 md:grid-cols-2">
            {access.mitteilungen ? (
              <CommunicationHubCapabilityLink
                href="/dashboard/communication/mitteilungen"
                title="Mitteilungen"
                description="Informationen gezielt an Mitglieder, Teams oder Zielgruppen senden."
                icon={Mail}
                linkLabel="Mitteilungen öffnen"
              />
            ) : null}
            {access.kampagnen ? (
              <CommunicationHubCapabilityLink
                href="/dashboard/communication/kampagnen"
                title="Kampagnen"
                description="Geplante Kommunikation vorbereiten und an definierte Zielgruppen versenden."
                icon={Send}
                linkLabel="Kampagnen öffnen"
              />
            ) : null}
          </div>
        </section>
      ) : null}

      {showOrganisation ? (
        <section aria-labelledby="communication-hub-org-heading" className="space-y-3">
          <HubSectionHeading
            id="communication-hub-org-heading"
            title="Organisation & Wiederverwendung"
          />
          <div className="grid gap-3 md:grid-cols-2">
            {access.zielgruppen ? (
              <CommunicationHubCapabilityLink
                href="/dashboard/communication/zielgruppen"
                title="Zielgruppen"
                description="Empfängergruppen einmal definieren und flexibel wiederverwenden."
                icon={UsersRound}
                linkLabel="Zielgruppen öffnen"
              />
            ) : null}
            {access.vorlagen ? (
              <CommunicationHubCapabilityLink
                href="/dashboard/communication/vorlagen"
                title="Vorlagen"
                description="Wiederkehrende Inhalte als Vorlagen speichern und schneller kommunizieren."
                icon={FileStack}
                linkLabel="Vorlagen öffnen"
              />
            ) : null}
          </div>
        </section>
      ) : null}

      {access.emailSender ? (
        <section aria-labelledby="communication-hub-settings-heading" className="space-y-3">
          <HubSectionHeading id="communication-hub-settings-heading" title="Einstellungen" />
          <div className="grid gap-3 md:grid-cols-2 lg:max-w-xl">
            <CommunicationHubCapabilityLink
              href="/dashboard/communication/email-sender"
              title="E-Mail-Absender"
              description="Absender für Vereins-E-Mails konfigurieren."
              icon={SlidersHorizontal}
              linkLabel="E-Mail-Absender öffnen"
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
