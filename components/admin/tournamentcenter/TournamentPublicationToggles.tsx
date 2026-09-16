"use client";

import { SwitchToggle } from "@/components/ui/SwitchToggle";

export type TournamentPublicationState = {
  websiteVisible: boolean;
  infoboardVisible: boolean;
  homepageVisible: boolean;
  wochenplanVisible: boolean;
  teamPageVisible: boolean;
};

type Props = {
  value: TournamentPublicationState;
  onChange: (patch: Partial<TournamentPublicationState>) => void;
  disabled?: boolean;
  testIdPrefix?: string;
};

export default function TournamentPublicationToggles({
  value,
  onChange,
  disabled = false,
  testIdPrefix = "tournament-publication",
}: Props) {
  return (
    <div
      className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 p-3 sm:p-4"
      data-testid={`${testIdPrefix}-group`}
    >
      <div
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        data-testid={`${testIdPrefix}-grid`}
      >
      <SwitchToggle
        id={`${testIdPrefix}-website`}
        label="Website"
        checked={value.websiteVisible}
        onChange={(checked) => onChange({ websiteVisible: checked })}
        disabled={disabled}
      />
      <SwitchToggle
        id={`${testIdPrefix}-infoboard`}
        label="Infoboard"
        checked={value.infoboardVisible}
        onChange={(checked) => onChange({ infoboardVisible: checked })}
        disabled={disabled}
      />
      <SwitchToggle
        id={`${testIdPrefix}-homepage`}
        label="Homepage"
        checked={value.homepageVisible}
        onChange={(checked) => onChange({ homepageVisible: checked })}
        disabled={disabled}
      />
      <SwitchToggle
        id={`${testIdPrefix}-wochenplan`}
        label="Wochenplan"
        checked={value.wochenplanVisible}
        onChange={(checked) => onChange({ wochenplanVisible: checked })}
        disabled={disabled}
      />
      <SwitchToggle
        id={`${testIdPrefix}-team-page`}
        label="Teamseite"
        checked={value.teamPageVisible}
        onChange={(checked) => onChange({ teamPageVisible: checked })}
        disabled={disabled}
      />
      </div>
    </div>
  );
}
