"use client";

import type { RequirementAudienceOriginLabels } from "@/lib/requirements/management-service";

type Props = {
  labels: RequirementAudienceOriginLabels;
  snapshotRecipientCount: number;
};

export default function RequirementAudienceOriginPanel({ labels, snapshotRecipientCount }: Props) {
  const hasAny =
    labels.persons.length +
      labels.teams.length +
      labels.orgUnits.length +
      labels.roles.length +
      labels.targetGroups.length >
    0;

  if (!hasAny) return null;

  return (
    <section
      className="space-y-2 rounded-lg border border-[var(--border)]/60 bg-[var(--surface-2)]/20 px-4 py-3"
      data-testid="requirement-audience-origin"
    >
      <p className="text-xs text-[var(--muted)]">
        Beim Aktivieren wurden {snapshotRecipientCount} Empfänger festgelegt.
      </p>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        Zielgruppe (Information)
      </p>
      <ul className="space-y-1 text-sm text-[var(--text-2)]">
        {labels.teams.map((entry) => (
          <li key={`team-${entry.teamId}`}>
            <span className="text-[var(--muted)]">Team</span> {entry.label}
          </li>
        ))}
        {labels.orgUnits.map((entry) => (
          <li key={`org-${entry.orgUnitId}`}>
            <span className="text-[var(--muted)]">Organisation</span> {entry.label}
          </li>
        ))}
        {labels.roles.map((entry) => (
          <li key={`role-${entry.roleId}`}>
            <span className="text-[var(--muted)]">Rolle</span> {entry.label}
          </li>
        ))}
        {labels.targetGroups.map((entry) => (
          <li key={`tg-${entry.targetGroupId}`}>
            <span className="text-[var(--muted)]">Zielgruppe</span> {entry.label}
          </li>
        ))}
        {labels.persons.map((entry) => (
          <li key={`person-${entry.personId}`}>
            <span className="text-[var(--muted)]">Person</span> {entry.label}
          </li>
        ))}
      </ul>
    </section>
  );
}
