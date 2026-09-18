"use client";

import { SwitchThumb } from "@/components/ui/SwitchToggle";

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
    description: "Turnier auf der öffentlichen Turnierseite anzeigen.",
  },
  {
    key: "infoboardVisible",
    label: "Infoboard",
    description: "Auf den Infoboards des Vereins anzeigen.",
  },
  {
    key: "homepageVisible",
    label: "Homepage",
    description:
      "Auf der öffentlichen Vereins-Homepage hervorheben. Zusätzlich muss die öffentliche Turnierseite aktiviert sein.",
  },
  {
    key: "wochenplanVisible",
    label: "Wochenplan",
    description:
      "Im öffentlichen Wochenplan anzeigen. Zusätzlich muss die öffentliche Turnierseite aktiviert sein.",
  },
  {
    key: "teamPageVisible",
    label: "Teamseite",
    description:
      "Auf der öffentlichen Teamseite des zugeordneten Teams. Zusätzlich muss die öffentliche Turnierseite aktiviert sein.",
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
      className="w-full divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40"
      data-testid={`${testIdPrefix}-group`}
      role="group"
      aria-label="Veröffentlichung"
    >
      {PUBLICATION_CHANNELS.map((channel) => {
        const controlId = `${testIdPrefix}-${channel.key}`;
        return (
          <div
            key={channel.key}
            className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
            data-testid={`${testIdPrefix}-row-${channel.key}`}
          >
            <div className="min-w-0 flex-1">
              <label htmlFor={controlId} className="block text-sm font-medium text-[var(--foreground)]">
                {channel.label}
              </label>
              <p className="mt-0.5 text-xs text-[var(--muted)]">{channel.description}</p>
            </div>
            <div className="flex shrink-0 items-center sm:justify-end">
              <SwitchThumb
                id={controlId}
                checked={value[channel.key]}
                onChange={(checked) => onChange({ [channel.key]: checked })}
                disabled={disabled}
                aria-label={channel.label}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
