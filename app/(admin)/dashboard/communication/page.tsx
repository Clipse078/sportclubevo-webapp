import {
  FileStack,
  Inbox,
  Mail,
  PenLine,
  Send,
  Signature,
  SlidersHorizontal,
  UsersRound,
} from "lucide-react";
import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";
import { ModuleCapabilityCard } from "@/components/admin/future-modules/ModuleCapabilityCard";
import { PageBreadcrumbs, PageHeader, PageShell } from "@/components/ui/page";
import { requireAnyPermission } from "@/lib/permissions/require-any-permission";
import { getRequestEffectivePermissions } from "@/lib/permissions/request-effective-permissions";
import {
  COMMUNICATION_HUB_ROUTE_PERMISSIONS,
  resolveCommunicationHubCapabilityAccess,
} from "@/lib/communication/hub-access";

export const dynamic = "force-dynamic";

export default async function CommunicationPage() {
  const session = await requireAnyPermission(COMMUNICATION_HUB_ROUTE_PERMISSIONS);
  const effectiveTenantId = session.user.activeTenantId ?? undefined;
  const { tenant: tenantPermissions } = await getRequestEffectivePermissions(
    session.user.id,
    effectiveTenantId,
  );
  const access = resolveCommunicationHubCapabilityAccess(tenantPermissions);

  return (
    <PageShell>
      <PageBreadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Kommunikation" },
        ]}
      />

      <PageHeader
        eyebrow="Kommunikation"
        title="Kommunikation"
        description="Nachrichten, Zielgruppen, Kampagnen und Vorlagen zentral verwalten."
      />

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
        <ProductDomainSceIcon
          name="communication"
          size={16}
          className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sce-primary)]"
        />
        <p className="text-xs leading-5 text-[var(--text-2)]">
          <span className="font-semibold text-[var(--foreground)]">
            Kommunikationscenter, Mitteilungen, Kampagnen, Zielgruppen, Vorlagen und E-Mail-Absender
            sind einsatzbereit.
          </span>{" "}
          Persönliche Signaturen und plattformweite Dokumentvorlagen folgen in späteren Ausbaustufen.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <ModuleCapabilityCard
          title="Kommunikationscenter"
          description="Nachrichten, E-Mails und offene Kommunikation zentral bearbeiten — inklusive inbound E-Mail/IMAP."
          icon={Inbox}
          status={access.inbox ? "Verfügbar" : "Demnächst"}
          href={access.inbox ? "/dashboard/communication/inbox" : undefined}
          linkLabel={access.inbox ? "Kommunikationscenter öffnen" : undefined}
          details={["Unified Inbox", "IMAP", "Zuweisung", "Antworten"]}
        />
        <ModuleCapabilityCard
          title="Mitteilungen"
          description="Organisationsweite Nachrichten, Mitteilungen und Alarme an Zielgruppen oder den ganzen Verein."
          icon={Mail}
          status={access.mitteilungen ? "Verfügbar" : "Demnächst"}
          href={access.mitteilungen ? "/dashboard/communication/mitteilungen" : undefined}
          linkLabel={access.mitteilungen ? "Mitteilungen öffnen" : undefined}
          details={["Nachricht", "Mitteilung", "Alarm", "Zielgruppen", "Entwürfe"]}
        />
        <ModuleCapabilityCard
          title="Kampagnen"
          description="Organisationsweite Kampagnen mit Entwurf, Bereit-Status und Veröffentlichung über die kanonische Kommunikationsplattform."
          icon={Send}
          status={access.kampagnen ? "Verfügbar" : "Demnächst"}
          href={access.kampagnen ? "/dashboard/communication/kampagnen" : undefined}
          linkLabel={access.kampagnen ? "Kampagnen öffnen" : undefined}
          details={["Entwurf", "Bereit", "Zielgruppen", "Empfängervorschau", "Push-Benachrichtigungen"]}
        />
        <ModuleCapabilityCard
          title="Neue Nachricht"
          description="Nachrichten an einzelne Personen oder zukünftige Zielgruppen senden."
          icon={PenLine}
          status="In Arbeit"
          details={["Einzelversand", "Zielgruppen", "Signaturauswahl"]}
        />
        <ModuleCapabilityCard
          title="Zielgruppen"
          description="Organisationsweite Zielgruppen definieren und verwalten — strukturelle Kriterien ohne Empfänger-Vollzählung."
          icon={UsersRound}
          status={access.zielgruppen ? "Verfügbar" : "Demnächst"}
          href={access.zielgruppen ? "/dashboard/communication/zielgruppen" : undefined}
          linkLabel={access.zielgruppen ? "Zielgruppen verwalten" : undefined}
          details={["Organisation & Teams", "Rollen", "Explizite Personen", "Archiv"]}
        />
        <ModuleCapabilityCard
          title="Vorlagen"
          description="Wiederverwendbare Inhalte für Kampagnen und Vereinsmitteilungen — erzeugen normale Entwürfe."
          icon={FileStack}
          status={access.vorlagen ? "Verfügbar" : "Demnächst"}
          href={access.vorlagen ? "/dashboard/communication/vorlagen" : undefined}
          linkLabel={access.vorlagen ? "Vorlagen verwalten" : undefined}
          details={["Kampagne", "Mitteilung", "Alarm", "Zielgruppen-Defaults", "Planung"]}
        />
        <ModuleCapabilityCard
          title="E-Mail-Absender"
          description="Absendername und E-Mail-Adresse des Vereins verwalten."
          icon={SlidersHorizontal}
          status={access.emailSender ? "Verfügbar" : "Demnächst"}
          href={access.emailSender ? "/dashboard/communication/email-sender" : undefined}
          linkLabel={access.emailSender ? "Absender verwalten" : undefined}
          details={["Tenant-spezifisch", "Sicherer Standardabsender", "Antwort-Zuordnung"]}
        />
        <ModuleCapabilityCard
          title="Persönliche Signaturen"
          description="Eigene Signaturen für persönliche Vereinskommunikation verwalten."
          icon={Signature}
          status="Demnächst"
          details={["Pro Benutzer und Verein", "Mehrere Signaturen", "Standard und Auswahl", "Historisch erhalten"]}
        />
      </div>
    </PageShell>
  );
}
