import { FormSection, type FormSectionProps } from "@/components/ui/FormSection";
import { cn } from "@/lib/cn";
import {
  TournamentSectionIcon,
  type TournamentSectionIconVariant,
} from "@/components/admin/tournamentcenter/tournament-semantic-icons";

export type TournamentFormSectionProps = FormSectionProps & {
  iconVariant?: TournamentSectionIconVariant;
};

/**
 * Tournament editor sections — compact metadata rail + constrained working
 * column so controls do not span the full ~1700px workspace.
 */
export function TournamentFormSection({
  className,
  contentClassName,
  title,
  iconVariant,
  ...props
}: TournamentFormSectionProps) {
  const titled = iconVariant ? (
    <span className="inline-flex items-center gap-2">
      <TournamentSectionIcon variant={iconVariant} />
      <span>{title}</span>
    </span>
  ) : (
    title
  );

  return (
    <FormSection
      {...props}
      title={titled}
      className={cn(
        "gap-5 border-[var(--border)] pb-7 pt-5 first:pt-0 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] lg:grid-cols-[minmax(0,12.5rem)_minmax(0,1fr)]",
        className,
      )}
      contentClassName={cn("max-w-3xl w-full", contentClassName)}
    />
  );
}
