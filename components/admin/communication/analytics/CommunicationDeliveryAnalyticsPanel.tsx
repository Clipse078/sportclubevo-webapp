import type { CommunicationDeliveryAnalytics } from "@/lib/communication/analytics/communication-delivery-analytics-service";
import { SectionCard } from "@/components/ui/page";

type Props = {
  analytics: CommunicationDeliveryAnalytics;
  showRecipientHint?: boolean;
};

function CountCell({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-[var(--text-2)]">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

export default function CommunicationDeliveryAnalyticsPanel({
  analytics,
  showRecipientHint,
}: Props) {
  if (!analytics.publication.deliveryAnalyticsApplicable) {
    return (
      <SectionCard title="Zustellung & Engagement" className="mt-6">
        <p className="text-sm text-[var(--text-2)]">
          {analytics.publication.scheduleStatus === "SCHEDULED" ||
          analytics.publication.scheduleStatus === "PROCESSING"
            ? "Geplant — Zustellkennzahlen stehen erst nach Veröffentlichung zur Verfügung."
            : "Noch nicht veröffentlicht — keine Zustellkennzahlen."}
        </p>
        {analytics.publication.scheduledAt ? (
          <p className="mt-2 text-sm">
            Geplant für:{" "}
            <time dateTime={analytics.publication.scheduledAt}>
              {new Date(analytics.publication.scheduledAt).toLocaleString("de-CH")}
            </time>
          </p>
        ) : null}
      </SectionCard>
    );
  }

  const { audience, channels, engagement, issues, safeguarding } = analytics;

  return (
    <div className="mt-6 space-y-6">
      <SectionCard title="Übersicht">
        <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
          <CountCell label="Betroffene Personen (Subjekte)" value={audience.targetSubjectCount} />
          <CountCell label="Empfänger-Snapshots" value={audience.recipientSnapshotCount} />
          <CountCell label="Zustell-Identitäten" value={audience.deliveryIdentityCount} />
        </dl>
        <p className="mt-3 text-xs text-[var(--text-2)]">{analytics.truthStatement}</p>
      </SectionCard>

      <SectionCard title="Zustellung">
        <div className="space-y-6">
          {channels.inApp.applicable ? (
            <div>
              <h3 className="mb-2 text-sm font-medium">In-App</h3>
              <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
                <CountCell label="Verfügbar" value={channels.inApp.available} />
                <CountCell label="Ungelesen" value={channels.inApp.unread} />
                <CountCell label="Gelesen" value={channels.inApp.read} />
                <CountCell label="Bestätigt" value={channels.inApp.acknowledged} />
                <CountCell label="Beantwortet" value={channels.inApp.responded} />
              </dl>
            </div>
          ) : (
            <p className="text-sm text-[var(--text-2)]">In-App: nicht anwendbar</p>
          )}

          {channels.push.applicable ? (
            <div>
              <h3 className="mb-2 text-sm font-medium">Push</h3>
              <p className="mb-2 text-xs text-[var(--text-2)]">
                Geräteversuche ({channels.push.deviceAttempts}) ≠ Zustell-Identitäten (
                {channels.push.recipientIdentities}). Akzeptiert bedeutet Provider-Annahme, nicht
                gelesen.
              </p>
              <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
                <CountCell label="Ausstehend" value={channels.push.outcomes.pending} />
                <CountCell label="Wird verarbeitet" value={channels.push.outcomes.processing} />
                <CountCell label="Gesendet" value={channels.push.outcomes.sent} />
                <CountCell label="Fehlgeschlagen" value={channels.push.outcomes.failed} />
                <CountCell label="Übersprungen" value={channels.push.outcomes.skipped} />
              </dl>
            </div>
          ) : (
            <p className="text-sm text-[var(--text-2)]">Push: keine Versuche erfasst</p>
          )}

          {channels.email.applicable ? (
            <div>
              <h3 className="mb-2 text-sm font-medium">E-Mail</h3>
              <p className="mb-2 text-xs text-[var(--text-2)]">
                „Gesendet“ = Provider-/Transport-Annahme (SMTP/API), nicht Zustellung ins Postfach
                und keine Öffnungs- oder Lese-Analytics.
              </p>
              <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
                <CountCell label="Ausstehend" value={channels.email.pending} />
                <CountCell label="Wird verarbeitet" value={channels.email.processing} />
                <CountCell label="Gesendet" value={channels.email.sent} />
                <CountCell label="Fehlgeschlagen" value={channels.email.failed} />
                <CountCell label="Übersprungen" value={channels.email.skipped} />
              </dl>
            </div>
          ) : (
            <p className="text-sm text-[var(--text-2)]">E-Mail: keine Versuche erfasst</p>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Engagement">
        <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <CountCell label="Gelesen (In-App)" value={engagement.inApp.read} />
          <CountCell label="Ungelesen (In-App)" value={engagement.inApp.unread} />
          {engagement.acknowledgementRequired ? (
            <CountCell label="Bestätigt" value={engagement.inApp.acknowledged} />
          ) : null}
          <CountCell label="Beantwortet" value={engagement.inApp.responded} />
        </dl>
        {engagement.typeSpecific.pollResponseCount !== null ? (
          <p className="mt-3 text-sm text-[var(--text-2)]">
            Umfrage: {engagement.typeSpecific.pollResponseCount} Antworten,{" "}
            {engagement.typeSpecific.pollOutstandingCount ?? 0} ausstehend
          </p>
        ) : null}
        {engagement.typeSpecific.requestClaimCount !== null ? (
          <p className="mt-1 text-sm text-[var(--text-2)]">
            Helfereinsatz/Anfrage: {engagement.typeSpecific.requestClaimCount} Zusagen,{" "}
            {engagement.typeSpecific.requestOutstandingCount ?? 0} offen
          </p>
        ) : null}
      </SectionCard>

      {(issues.emailFailed > 0 ||
        issues.emailSkipped > 0 ||
        issues.pushFailed > 0 ||
        issues.pushSkipped > 0 ||
        safeguarding.guardianExpandedDeliveries > 0) && (
        <SectionCard title="Hinweise & Probleme">
          <ul className="list-inside list-disc space-y-1 text-sm">
            {issues.emailFailed > 0 ? (
              <li>E-Mail fehlgeschlagen: {issues.emailFailed}</li>
            ) : null}
            {issues.emailSkipped > 0 ? (
              <li>E-Mail übersprungen: {issues.emailSkipped}</li>
            ) : null}
            {issues.skipReasons.preferenceDisabled > 0 ? (
              <li>Präferenz deaktiviert: {issues.skipReasons.preferenceDisabled}</li>
            ) : null}
            {issues.skipReasons.consentRequired > 0 ? (
              <li>Einwilligung erforderlich: {issues.skipReasons.consentRequired}</li>
            ) : null}
            {issues.pushFailed > 0 ? <li>Push fehlgeschlagen: {issues.pushFailed}</li> : null}
            {safeguarding.guardianExpandedDeliveries > 0 ? (
              <li>
                Jugendschutz: {safeguarding.guardianExpandedDeliveries} Zustellungen über
                Erziehungsberechtigte
              </li>
            ) : null}
            {safeguarding.guardianUnavailableExclusions > 0 ? (
              <li>
                Ausgeschlossen (kein verfügbarer Erziehungsberechtigter):{" "}
                {safeguarding.guardianUnavailableExclusions}
              </li>
            ) : null}
          </ul>
        </SectionCard>
      )}

      {showRecipientHint ? (
        <p className="text-xs text-[var(--text-2)]">
          Empfängerdetails sind über die API{" "}
          <code className="rounded bg-[var(--surface-2)] px-1">/api/communication/…/delivery-detail</code>{" "}
          für berechtigte Administratoren paginiert verfügbar.
        </p>
      ) : null}
    </div>
  );
}
