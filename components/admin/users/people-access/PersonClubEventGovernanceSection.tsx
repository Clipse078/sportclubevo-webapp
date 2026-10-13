"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SwitchToggle } from "@/components/ui/SwitchToggle";
import { SceSegmentedControl } from "@/components/admin/shared/SceSegmentedControl";
import { CLUB_EVENT_GOVERNANCE_PEOPLE_ACCESS_HREF } from "@/lib/club-events/governance/club-event-governance-people-access-context";

type Props = {
  personId: string;
  canManage: boolean;
};

const PUBLICATION_COPY = {
  DIRECT_PUBLISH:
    "Von dieser Person erstellte Veranstaltungen werden nach erfolgreicher Prüfung der Eingaben und fachlichen Validierung direkt veröffentlicht — ohne separate menschliche Freigabe.",
  APPROVAL_REQUIRED:
    "Von dieser Person erstellte Veranstaltungen werden zur Freigabe eingereicht und benötigen eine Entscheidung durch eine freigabeberechtigte Person, bevor sie veröffentlicht werden.",
} as const;

const ZERO_VALIDATOR_MESSAGE =
  "Keine freigabeberechtigte Person hinterlegt. «Freigabe erforderlich» kann erst aktiviert werden, wenn mindestens eine freigabeberechtigte Person auf Club-Ebene hinterlegt ist.";

export default function PersonClubEventGovernanceSection({ personId, canManage }: Props) {
  const [createEnabled, setCreateEnabled] = useState(true);
  const [publicationAuthority, setPublicationAuthority] = useState<
    "DIRECT_PUBLISH" | "APPROVAL_REQUIRED"
  >("DIRECT_PUBLISH");
  const [validatorCount, setValidatorCount] = useState(0);
  const [validatorNames, setValidatorNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/sce/activity-governance/club-event")
      .then((r) => r.json())
      .then((data) => {
        const typePolicy = data.policy?.activityTypes?.find(
          (row: { activityType: string }) => row.activityType === "CLUB_EVENT",
        );
        const people = Array.isArray(data.validatorPeople)
          ? (data.validatorPeople as Array<{ displayName?: string }>)
          : [];
        setValidatorNames(
          people
            .map((row) => row.displayName)
            .filter((name): name is string => typeof name === "string" && name.length > 0),
        );
        setValidatorCount(typePolicy?.validatorPersonIds?.length ?? people.length ?? 0);
        const creator = typePolicy?.creatorPolicies?.find(
          (row: { personId: string; createEnabled?: boolean }) => row.personId === personId,
        );
        if (creator) {
          setCreateEnabled(creator.createEnabled !== false);
          setPublicationAuthority(creator.publicationAuthority);
        }
      })
      .catch(() => undefined);
  }, [personId]);

  async function persist(next: {
    createEnabled: boolean;
    publicationAuthority: "DIRECT_PUBLISH" | "APPROVAL_REQUIRED";
  }) {
    if (!canManage) return;
    if (
      next.createEnabled &&
      next.publicationAuthority === "APPROVAL_REQUIRED" &&
      validatorCount === 0
    ) {
      setError(ZERO_VALIDATOR_MESSAGE);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/sce/activity-governance/club-event", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personId,
          createEnabled: next.createEnabled,
          publicationAuthority: next.publicationAuthority,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? ZERO_VALIDATOR_MESSAGE);
      }
    } finally {
      setSaving(false);
    }
  }

  const validatorSummary =
    validatorCount === 0
      ? ZERO_VALIDATOR_MESSAGE
      : validatorCount === 1
        ? "1 freigabeberechtigte Person ist auf Club-Ebene hinterlegt."
        : `${validatorCount} freigabeberechtigte Personen sind auf Club-Ebene hinterlegt.`;

  return (
    <div className="space-y-6" data-testid="person-club-event-governance-block">
      <div className="space-y-2">
        <h2 className="text-base font-semibold text-[var(--foreground)]">Veranstaltungs-Freigaben</h2>
        <p className="max-w-3xl text-sm text-[var(--text-2)]">
          Steuert, ob diese Person Veranstaltungen erstellen darf und ob eingereichte Veranstaltungen
          direkt veröffentlicht werden oder eine Freigabe benötigen. Freigabeberechtigte Personen werden
          zentral auf Club-Ebene verwaltet — nicht pro Person dupliziert.
        </p>
      </div>

      <section
        className="space-y-5 rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-4 sm:p-5"
        data-testid="person-club-event-governance"
      >
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Erstellberechtigung</h3>
          <SwitchToggle
            id={`person-club-event-create-${personId}`}
            checked={createEnabled}
            onChange={(checked) => {
              setCreateEnabled(checked);
              void persist({ createEnabled: checked, publicationAuthority });
            }}
            disabled={!canManage || saving}
            label="Veranstaltungen erstellen"
          />
          <p className="text-xs text-[var(--text-2)]">
            Erlaubt das Anlegen von Veranstaltungen im Namen dieser Person im Club.
          </p>
        </div>

        {createEnabled ? (
          <div className="space-y-3 border-t border-[var(--border)] pt-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Veröffentlichung</h3>
              <p className="text-xs text-[var(--text-2)]">
                Wähle genau eine Regel — direkte Veröffentlichung oder Freigabe durch eine berechtigte
                Person.
              </p>
            </div>
            <SceSegmentedControl<"DIRECT_PUBLISH" | "APPROVAL_REQUIRED">
              value={publicationAuthority}
              onChange={(value) => {
                if (value === "APPROVAL_REQUIRED" && validatorCount === 0) {
                  setError(ZERO_VALIDATOR_MESSAGE);
                  return;
                }
                setPublicationAuthority(value);
                void persist({ createEnabled, publicationAuthority: value });
              }}
              disabled={!canManage || saving}
              options={[
                { value: "DIRECT_PUBLISH", label: "Direkt veröffentlichen" },
                { value: "APPROVAL_REQUIRED", label: "Freigabe erforderlich" },
              ]}
              aria-label="Veröffentlichung Veranstaltung"
              testId="person-club-event-publication-authority"
            />
            <p className="text-xs leading-relaxed text-[var(--text-2)]" data-testid="person-club-event-publication-copy">
              {PUBLICATION_COPY[publicationAuthority]}
            </p>
            {publicationAuthority === "APPROVAL_REQUIRED" ? (
              <div
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/60 px-3 py-2 text-xs text-[var(--text-2)]"
                data-testid="person-club-event-approval-context"
              >
                <p className="font-semibold text-[var(--foreground)]">Freigabe durch</p>
                {validatorCount === 0 ? (
                  <p className="mt-1 text-rose-200/90" role="status">
                    {ZERO_VALIDATOR_MESSAGE}
                  </p>
                ) : (
                  <p className="mt-1">
                    {validatorNames.length > 0
                      ? validatorNames.join(" · ")
                      : `${validatorCount} freigabeberechtigte Person${validatorCount === 1 ? "" : "en"}`}
                    {" — "}
                    eine berechtigte Person reicht für die Freigabe (V1).
                  </p>
                )}
                {canManage ? (
                  <Link
                    href={CLUB_EVENT_GOVERNANCE_PEOPLE_ACCESS_HREF}
                    className="mt-2 inline-block font-semibold text-[var(--sce-primary)] hover:underline"
                    data-testid="person-club-event-approval-manage-validators"
                  >
                    Freigabeberechtigte verwalten
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <div className="space-y-2 rounded-lg border border-rose-500/30 bg-rose-950/20 px-3 py-2">
            <p className="text-xs text-rose-200" role="alert">
              {error}
            </p>
            {error.includes("freigabeberechtigte") || error.includes("Freigabe erforderlich") ? (
              <Link
                href={CLUB_EVENT_GOVERNANCE_PEOPLE_ACCESS_HREF}
                className="inline-block text-xs font-semibold text-[var(--sce-primary)] hover:underline"
                data-testid="person-club-event-manage-validators"
              >
                Freigabeberechtigte verwalten
              </Link>
            ) : null}
          </div>
        ) : null}
      </section>

      <aside
        className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-4"
        data-testid="person-club-event-validator-context"
      >
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Freigabe auf Club-Ebene</h3>
        <p className="text-xs leading-relaxed text-[var(--text-2)]">{validatorSummary}</p>
        <p className="text-xs text-[var(--text-2)]">
          Freigabeberechtigte prüfen eingereichte Veranstaltungen — unabhängig von dieser
          Ersteller-Konfiguration.
        </p>
        {canManage ? (
          <Link
            href={CLUB_EVENT_GOVERNANCE_PEOPLE_ACCESS_HREF}
            className="fca-button-secondary inline-flex text-xs"
            data-testid="person-club-event-validator-context-link"
          >
            Freigabeberechtigte verwalten
          </Link>
        ) : null}
      </aside>
    </div>
  );
}
