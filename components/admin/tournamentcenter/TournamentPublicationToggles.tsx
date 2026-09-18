"use client";

import { SwitchThumb } from "@/components/ui/SwitchToggle";
import { TOURNAMENT_PUBLICATION_CHANNEL_ICONS } from "@/components/admin/tournamentcenter/tournament-semantic-icons";
import { cn } from "@/lib/cn";

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
    label: "Website",
    description: "Das Turnier wird auf der Vereinswebsite veröffentlicht.",
  },
  {
    key: "infoboardVisible",
    label: "Infoboard",
    description: "Das Turnier wird auf dem Vereins-Infoboard angezeigt.",
  },
  {
    key: "homepageVisible",
    label: "Homepage",
    description:
      "Das Turnier wird auf der Vereins-Homepage hervorgehoben. Zusätzlich muss die Website-Veröffentlichung aktiv sein.",
  },
  {
    key: "wochenplanVisible",
    label: "Wochenplan",
    description: "Das Turnier erscheint im öffentlichen Wochenplan.",
  },
  {
    key: "teamPageVisible",
    label: "Teamseite",
    description:
      "Das Turnier erscheint auf der Teamseite des zugeordneten Hauptteams. Zusätzlich muss die Website-Veröffentlichung aktiv sein.",
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
        const ChannelIcon = TOURNAMENT_PUBLICATION_CHANNEL_ICONS[channel.key];
        return (
          <div
            key={channel.key}
            className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
            data-testid={`${testIdPrefix}-row-${channel.key}`}
          >
            <div className="min-w-0 flex-1">
              <label
                htmlFor={controlId}
                className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]"
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)]",
                  )}
                  aria-hidden
                >
                  <ChannelIcon className="h-3.5 w-3.5" />
                </span>
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
