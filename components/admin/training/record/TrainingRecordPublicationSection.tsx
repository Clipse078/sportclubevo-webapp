"use client";

import { useState } from "react";
import Link from "next/link";
import { Globe, Loader2, Monitor } from "lucide-react";
import { useTranslations } from "next-intl";
import { SwitchThumb } from "@/components/ui/SwitchToggle";
import PlanningPublicationInheritanceBadge from "@/components/admin/shared/planning-editor/PlanningPublicationInheritanceBadge";
import { cn } from "@/lib/cn";

type PublicationState = {
  trainingWebsiteVisible: boolean;
  infoboardVisible: boolean;
};

type Props = {
  teamId: string;
  teamSeasonId: string;
  initialPublication: PublicationState;
  canEditTeamPublication: boolean;
  teamSettingsHref: string;
};

export default function TrainingRecordPublicationSection({
  teamId,
  teamSeasonId,
  initialPublication,
  canEditTeamPublication,
  teamSettingsHref,
}: Props) {
  const t = useTranslations("PlanningEditor.operational.publication");
  const [publication, setPublication] = useState(initialPublication);
  const [websitePending, setWebsitePending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateTrainingWebsiteVisible(next: boolean) {
    if (!canEditTeamPublication) return;
    setWebsitePending(true);
    setError(null);
    const previous = publication.trainingWebsiteVisible;
    setPublication((current) => ({ ...current, trainingWebsiteVisible: next }));

    try {
      const res = await fetch(`/api/teams/${teamId}/team-seasons/${teamSeasonId}/publication`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trainingWebsiteVisible: next }),
      });
      const data = (await res.json().catch(() => null)) as {
        publication?: { trainingWebsiteVisible?: boolean };
        error?: string;
      } | null;

      if (!res.ok) {
        setPublication((current) => ({ ...current, trainingWebsiteVisible: previous }));
        setError(data?.error ?? "Speichern fehlgeschlagen.");
        return;
      }

      if (typeof data?.publication?.trainingWebsiteVisible === "boolean") {
        setPublication((current) => ({
          ...current,
          trainingWebsiteVisible: data.publication!.trainingWebsiteVisible!,
        }));
      }
    } catch {
      setPublication((current) => ({ ...current, trainingWebsiteVisible: previous }));
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setWebsitePending(false);
    }
  }

  const websiteSwitchDisabled = !canEditTeamPublication || websitePending;

  return (
    <div
      className="divide-y divide-[var(--border)]/70 px-3 py-1 md:px-4"
      data-testid="training-record-publication"
    >
      <p className="py-2 text-xs text-[var(--muted)]" data-testid="training-record-publication-scope-intro">
        {t("trainingIntro")}
      </p>

      <div
        className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
        data-testid="training-record-publication-website-row"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Globe className="h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden />
            <span className="text-sm font-medium text-[var(--foreground)]">{t("channels.website.label")}</span>
            <PlanningPublicationInheritanceBadge testId="training-record-publication-website-badge" />
          </div>
          <p className="mt-0.5 pl-6 text-xs text-[var(--muted)] sm:pl-6">{t("trainingWebsiteDescription")}</p>
        </div>
        <div className="relative flex shrink-0 items-center gap-2 pl-6 sm:pl-0">
          <SwitchThumb
            id="training-record-publication-website"
            checked={publication.trainingWebsiteVisible}
            onChange={updateTrainingWebsiteVisible}
            disabled={websiteSwitchDisabled}
            aria-label={t("channels.website.label")}
          />
          {websitePending ? (
            <Loader2 className="h-4 w-4 animate-spin text-[var(--muted)]" aria-hidden />
          ) : null}
        </div>
      </div>

      <div
        className="flex flex-col gap-2 py-3.5"
        data-testid="training-record-publication-infoboard-row"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Monitor className="h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden />
          <span className="text-sm font-medium text-[var(--foreground)]">{t("channels.infoboard.label")}</span>
          <PlanningPublicationInheritanceBadge testId="training-record-publication-infoboard-badge" />
        </div>
        <p className="pl-6 text-xs text-[var(--muted)]">{t("trainingInfoboardDescription")}</p>
        <p
          className={cn(
            "pl-6 text-sm font-medium",
            publication.infoboardVisible ? "text-[var(--foreground)]" : "text-[var(--text-2)]",
          )}
          data-testid="training-record-publication-infoboard-effective"
        >
          {publication.infoboardVisible ? t("infoboardEffectiveOn") : t("infoboardEffectiveOff")}
        </p>
        <Link
          href={teamSettingsHref}
          className="pl-6 text-xs font-semibold text-[var(--sce-primary)] hover:underline"
          data-testid="training-record-publication-team-settings-link"
        >
          {t("manageTeamPublicationSettings")}
        </Link>
      </div>

      {error ? (
        <p className="py-2 text-xs text-[var(--sce-danger)]" role="alert">
          {error}
        </p>
      ) : null}

      {!canEditTeamPublication ? (
        <p className="py-2 text-xs text-[var(--muted)]">{t("trainingWebsitePermissionHint")}</p>
      ) : null}
    </div>
  );
}
