"use client";

import { useEffect, useState } from "react";
import { SwitchToggle } from "@/components/ui/SwitchToggle";
import { SceSegmentedControl } from "@/components/admin/shared/SceSegmentedControl";

type Props = {
  personId: string;
  canManage: boolean;
};

export default function PersonClubEventGovernanceSection({ personId, canManage }: Props) {
  const [createEnabled, setCreateEnabled] = useState(true);
  const [publicationAuthority, setPublicationAuthority] = useState<
    "DIRECT_PUBLISH" | "APPROVAL_REQUIRED"
  >("DIRECT_PUBLISH");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/sce/activity-governance/club-event")
      .then((r) => r.json())
      .then((data) => {
        const typePolicy = data.policy?.activityTypes?.find(
          (row: { activityType: string }) => row.activityType === "CLUB_EVENT",
        );
        const creator = typePolicy?.creatorPolicies?.find(
          (row: { personId: string }) => row.personId === personId,
        );
        if (creator) {
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
        setError(data?.error ?? "Speichern fehlgeschlagen.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-[var(--border)] p-3" data-testid="person-club-event-governance">
      <h3 className="text-sm font-semibold">Veranstaltungen erstellen</h3>
      <SwitchToggle
        id={`person-club-event-create-${personId}`}
        checked={createEnabled}
        onChange={(checked) => {
          setCreateEnabled(checked);
          void persist({ createEnabled: checked, publicationAuthority });
        }}
        disabled={!canManage || saving}
        label="Darf Veranstaltungen erstellen"
      />
      {createEnabled ? (
        <div className="space-y-1">
          <span className="text-xs font-medium text-[var(--text-2)]">Publikationsbefugnis</span>
          <SceSegmentedControl<"DIRECT_PUBLISH" | "APPROVAL_REQUIRED">
            value={publicationAuthority}
            onChange={(value) => {
              setPublicationAuthority(value);
              void persist({ createEnabled, publicationAuthority: value });
            }}
            disabled={!canManage || saving}
            options={[
              { value: "DIRECT_PUBLISH", label: "Direkt publizieren" },
              { value: "APPROVAL_REQUIRED", label: "Freigabe erforderlich" },
            ]}
            aria-label="Publikationsbefugnis Veranstaltung"
            testId="person-club-event-publication-authority"
          />
        </div>
      ) : null}
      {error ? (
        <p className="text-xs text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
