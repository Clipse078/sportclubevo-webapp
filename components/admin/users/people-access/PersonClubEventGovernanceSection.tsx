"use client";

import { useEffect, useRef, useState } from "react";
import { SwitchToggle } from "@/components/ui/SwitchToggle";
import { SceSegmentedControl } from "@/components/admin/shared/SceSegmentedControl";
import ClubEventValidatorPoolSection from "./ClubEventValidatorPoolSection";

type Props = {
  personId: string;
  canManage: boolean;
};

export default function PersonClubEventGovernanceSection({ personId, canManage }: Props) {
  const [createEnabled, setCreateEnabled] = useState(true);
  const [publicationAuthority, setPublicationAuthority] = useState<
    "DIRECT_PUBLISH" | "APPROVAL_REQUIRED"
  >("DIRECT_PUBLISH");
  const [validatorCount, setValidatorCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const validatorPoolRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/admin/sce/activity-governance/club-event")
      .then((r) => r.json())
      .then((data) => {
        const typePolicy = data.policy?.activityTypes?.find(
          (row: { activityType: string }) => row.activityType === "CLUB_EVENT",
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
      setError(
        "Für Veranstaltungen ist noch keine freigabeberechtigte Person hinterlegt. Füge zuerst mindestens eine Person für die Freigabe hinzu.",
      );
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
        setError(
          data?.error ??
            "Für Veranstaltungen ist noch keine freigabeberechtigte Person hinterlegt. Füge zuerst mindestens eine Person für die Freigabe hinzu.",
        );
      }
    } finally {
      setSaving(false);
    }
  }

  function focusValidatorPool() {
    document.getElementById("club-event-validator-pool")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="space-y-4" data-testid="person-club-event-governance-block">
      <section
        className="space-y-3 rounded-xl border border-[var(--border)] p-3"
        data-testid="person-club-event-governance"
      >
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-2)]">
          Club Event
        </h3>
        <SwitchToggle
          id={`person-club-event-create-${personId}`}
          checked={createEnabled}
          onChange={(checked) => {
            setCreateEnabled(checked);
            void persist({ createEnabled: checked, publicationAuthority });
          }}
          disabled={!canManage || saving}
          label="Aktivitäten erstellen"
        />
        {createEnabled ? (
          <div className="space-y-1">
            <span className="text-xs font-medium text-[var(--text-2)]">Veröffentlichung</span>
            <SceSegmentedControl<"DIRECT_PUBLISH" | "APPROVAL_REQUIRED">
              value={publicationAuthority}
              onChange={(value) => {
                if (value === "APPROVAL_REQUIRED" && validatorCount === 0) {
                  setError(
                    "Für Veranstaltungen ist noch keine freigabeberechtigte Person hinterlegt. Füge zuerst mindestens eine Person für die Freigabe hinzu.",
                  );
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
          </div>
        ) : null}
        {error ? (
          <div className="space-y-2">
            <p className="text-xs text-rose-600" role="alert">
              {error}
            </p>
            {error.includes("freigabeberechtigte") ? (
              <button
                type="button"
                className="text-xs font-semibold text-[var(--sce-primary)] hover:underline"
                onClick={focusValidatorPool}
              >
                Freigabeberechtigte konfigurieren
              </button>
            ) : null}
          </div>
        ) : null}
      </section>
      <div ref={validatorPoolRef}>
        <ClubEventValidatorPoolSection
          canManage={canManage}
          onValidatorCountChange={setValidatorCount}
        />
      </div>
    </div>
  );
}
