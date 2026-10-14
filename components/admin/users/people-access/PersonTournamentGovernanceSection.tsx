"use client";

import { useEffect, useState } from "react";
import { SwitchToggle } from "@/components/ui/SwitchToggle";
import { SceSegmentedControl } from "@/components/admin/shared/SceSegmentedControl";

type Props = {
  personId: string;
  canManage: boolean;
};

const ZERO_VALIDATOR_MESSAGE =
  "Keine freigabeberechtigte Person hinterlegt. «Freigabe erforderlich» kann erst aktiviert werden, wenn mindestens eine freigabeberechtigte Person für Turniere hinterlegt ist.";

export default function PersonTournamentGovernanceSection({ personId, canManage }: Props) {
  const [createEnabled, setCreateEnabled] = useState(true);
  const [publicationAuthority, setPublicationAuthority] = useState<
    "DIRECT_PUBLISH" | "APPROVAL_REQUIRED"
  >("DIRECT_PUBLISH");
  const [validatorCount, setValidatorCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/sce/activity-governance/tournament")
      .then((r) => r.json())
      .then((data) => {
        const typePolicy = data.policy?.activityTypes?.find(
          (row: { activityType: string }) => row.activityType === "TOURNAMENT",
        );
        setValidatorCount(typePolicy?.validatorPersonIds?.length ?? 0);
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
      const res = await fetch("/api/admin/sce/activity-governance/tournament", {
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
        setError(data?.error ?? "Speichern fehlgeschlagen.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-[var(--border)] p-4" data-testid="person-tournament-governance-section">
      <div>
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Turniere</h3>
        <p className="text-xs text-[var(--text-2)]">Erstell- und Freigabeverhalten für manuelle Turniere.</p>
      </div>
      <SwitchToggle
        id="person-tournament-create-enabled"
        checked={createEnabled}
        onChange={(checked) => {
          setCreateEnabled(checked);
          void persist({ createEnabled: checked, publicationAuthority });
        }}
        disabled={!canManage || saving}
        label="Turniere erstellen"
        description="Darf diese Person Turniere im Composer anlegen?"
      />
      <div className="space-y-2">
        <span className="fca-label">Veröffentlichungsmodus</span>
        <SceSegmentedControl
          value={publicationAuthority}
          onChange={(value) => {
            const next = value as "DIRECT_PUBLISH" | "APPROVAL_REQUIRED";
            setPublicationAuthority(next);
            void persist({ createEnabled, publicationAuthority: next });
          }}
          disabled={!canManage || saving || !createEnabled}
          options={[
            { value: "DIRECT_PUBLISH", label: "Direkt veröffentlichen" },
            { value: "APPROVAL_REQUIRED", label: "Freigabe erforderlich" },
          ]}
          aria-label="Turnier-Publikationsmodus"
          testId="person-tournament-publication-authority"
        />
      </div>
      {error ? <p className="text-xs text-[var(--sce-danger)]">{error}</p> : null}
    </section>
  );
}
