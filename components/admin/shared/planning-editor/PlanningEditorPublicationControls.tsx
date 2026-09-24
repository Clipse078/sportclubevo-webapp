"use client";

import { useTranslations } from "next-intl";
import { SwitchThumb } from "@/components/ui/SwitchToggle";
import type {
  PlanningPublicationChannelConfig,
  PlanningPublicationValues,
} from "@/lib/planning/planning-publication-channels";
import { cn } from "@/lib/cn";

type Props = {
  channels: PlanningPublicationChannelConfig[];
  value: PlanningPublicationValues;
  onChange: (patch: Partial<PlanningPublicationValues>) => void;
  disabled?: boolean;
  testIdPrefix?: string;
  headingId?: string;
  /** Hide the built-in heading when embedded in PlanningEditorControlBar. */
  showHeading?: boolean;
};

export default function PlanningEditorPublicationControls({
  channels,
  value,
  onChange,
  disabled = false,
  testIdPrefix = "planning-publication",
  headingId = "planning-publication-heading",
  showHeading = true,
}: Props) {
  const t = useTranslations("PlanningEditor.operational.publication");

  return (
    <section
      className="w-full"
      aria-labelledby={showHeading ? headingId : undefined}
      data-testid={`${testIdPrefix}-section`}
    >
      {showHeading ? (
        <h2 id={headingId} className="mb-2 text-sm font-semibold text-[var(--foreground)]">
          {t("heading")}
        </h2>
      ) : null}
      <div
        className="w-full divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40"
        data-testid={`${testIdPrefix}-group`}
        role="group"
        aria-label={t("heading")}
      >
        {channels.map((channel) => {
          const controlId = `${testIdPrefix}-${channel.key}`;
          const checked = value[channel.key] ?? false;
          const switchDisabled =
            disabled || (channel.dependsOnWebsite ? !value.websiteVisible : false);
          const ChannelIcon = channel.Icon;

          return (
            <div
              key={channel.key}
              className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
              data-testid={`${testIdPrefix}-row-${channel.key}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  <ChannelIcon
                    className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]"
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <label
                      htmlFor={controlId}
                      className={cn(
                        "block text-sm font-medium text-[var(--foreground)]",
                        switchDisabled && !disabled ? "cursor-default" : "cursor-pointer",
                      )}
                    >
                      {t(channel.labelKey as "channels.website.label")}
                    </label>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">
                      {switchDisabled && channel.dependsOnWebsite && !disabled
                        ? t("homepageRequiresWebsite")
                        : t(channel.descriptionKey as "channels.website.descriptionTournament")}
                    </p>
                  </div>
                </div>
              </div>
              <SwitchThumb
                id={controlId}
                checked={checked}
                onChange={(next) => onChange({ [channel.key]: next })}
                disabled={switchDisabled}
                aria-label={t(channel.labelKey as "channels.website.label")}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
