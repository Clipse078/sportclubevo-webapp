"use client";

import { SwitchToggle } from "@/components/ui/SwitchToggle";

export type TournamentPublicationState = {
  websiteVisible: boolean;
  infoboardVisible: boolean;
  homepageVisible: boolean;
  wochenplanVisible: boolean;
  teamPageVisible: boolean;
};

type PublicationChannelConfig = {
  key: keyof TournamentPublicationState;
  label: string;
  description: string;
};

const PUBLICATION_CHANNELS: PublicationChannelConfig[] = [
  {
    key: "websiteVisible",
    label: "Öffentliche Turnierseite",
    description: "Turnier auf der Vereinswebsite und in öffentlichen Turnierlisten.",
  },
  {
    key: "infoboardVisible",
    label: "Infoboard",
    description: "Auf den Infoboard-Anzeigen berücksichtigen.",
  },
  {
    key: "homepageVisible",
    label: "Homepage",
    description: "Auf der öffentlichen Vereins-Homepage hervorheben.",
  },
  {
    key: "wochenplanVisible",
    label: "Wochenplan",
    description: "Im öffentlichen Wochenplan anzeigen.",
  },
  {
    key: "teamPageVisible",
    label: "Teamseite",
    description: "Auf der öffentlichen Teamseite des zugeordneten Teams.",
  },
];

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
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        data-testid={`${testIdPrefix}-grid`}
      >
        {PUBLICATION_CHANNELS.map((channel) => (
          <SwitchToggle
            key={channel.key}
            id={`${testIdPrefix}-${channel.key}`}
            label={channel.label}
            description={channel.description}
            checked={value[channel.key]}
            onChange={(checked) => onChange({ [channel.key]: checked })}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}
