"use client";

/**
 * TURNIERE-UX-02A — canonical Veranstalter selector (single Club Directory Verein).
 * R4: HOME tournaments resolve tenant club as authoritative organiser (non-editable).
 */

import { ExternalClubPicker, type ExternalClubPickerResult } from "./ExternalClubPicker";
import { ClubCrest } from "@/components/sporting-activity/ClubCrest";
import { buildClubIdentity } from "@/lib/sporting-activity-design/club-identity";
import { buildTenantOrganiserPickerResult } from "@/lib/tournaments/composer/tournament-composer-organiser";

export type TournamentOrganizerClubFieldProps = {
  homeAway: "HOME" | "AWAY";
  tenantClubName: string;
  tenantLogoUrl: string | null;
  selected: ExternalClubPickerResult | null;
  onChange: (club: ExternalClubPickerResult | null) => void;
  disabled?: boolean;
  testId?: string;
  label?: string;
};

export default function TournamentOrganizerClubField({
  homeAway,
  tenantClubName,
  tenantLogoUrl,
  selected,
  onChange,
  disabled = false,
  testId = "tournament-organizer-club",
  label = "Veranstalter",
}: TournamentOrganizerClubFieldProps) {
  if (homeAway === "HOME") {
    const tenantOrganiser = buildTenantOrganiserPickerResult(tenantClubName, tenantLogoUrl);
    const organiserIdentity = buildClubIdentity({
      id: tenantOrganiser.id,
      displayName: tenantOrganiser.name,
      shortName: tenantOrganiser.shortName,
      logoUrl: tenantOrganiser.logoUrl ?? null,
    });

    return (
      <div className="block space-y-2 sm:col-span-2" data-testid={testId}>
        <span className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">{label}</span>
        <div
          className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 px-3 py-3"
          data-testid={`${testId}-tenant-identity`}
        >
          <ClubCrest identity={organiserIdentity} density="management" decorative />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-[var(--foreground)]">{tenantClubName}</p>
            <p className="text-xs text-[var(--text-2)]">Veranstalter</p>
          </div>
        </div>
      </div>
    );
  }

  const organiserIdentity = selected
    ? buildClubIdentity({
        id: selected.id,
        displayName: selected.name,
        shortName: selected.shortName,
        logoUrl: selected.logoUrl ?? null,
      })
    : null;

  return (
    <div className="block space-y-2 sm:col-span-2" data-testid={testId}>
      <span className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">{label}</span>
      {organiserIdentity ? (
        <div
          className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 px-3 py-2"
          data-testid={`${testId}-identity`}
        >
          <ClubCrest identity={organiserIdentity} density="management" decorative />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-[var(--foreground)]">{selected!.name}</p>
            <p className="text-xs text-[var(--text-2)]">Veranstalter</p>
          </div>
          <button
            type="button"
            className="fca-button-secondary h-8 shrink-0 px-2 text-xs"
            onClick={() => onChange(null)}
            disabled={disabled}
            data-testid={`${testId}-change`}
          >
            Ändern
          </button>
        </div>
      ) : (
        <ExternalClubPicker
          selected={selected}
          onSelect={(club) => onChange(club)}
          onClearSelected={() => onChange(null)}
          disabled={disabled}
          placeholder="Verein suchen…"
          testId={`${testId}-picker`}
        />
      )}
    </div>
  );
}
