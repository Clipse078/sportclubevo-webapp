import { cn } from "@/lib/cn";
import type {
  SceActivityPresentationDensity,
  SceMatchPresentationModel,
} from "@/lib/sporting-activity-presentation/canonical/types";

function resolveResultText(model: SceMatchPresentationModel): string | null {
  const result = model.result;
  if (!result) return null;

  if (result.displayLabel?.trim()) {
    return result.displayLabel.trim();
  }

  if (result.scoreHome != null && result.scoreAway != null) {
    return `${result.scoreHome}:${result.scoreAway}`;
  }

  return null;
}

export type SceMatchCardResultProps = {
  model: SceMatchPresentationModel;
  density: SceActivityPresentationDensity;
  className?: string;
};

export function SceMatchCardResult({ model, density, className }: SceMatchCardResultProps) {
  const text = resolveResultText(model);
  if (!text) return null;

  const prominent =
    density === "HERO" || density === "STANDARD" || model.matchLifecycle?.semantic === "completed";

  return (
    <span
      className={cn(
        "shrink-0 font-semibold tabular-nums text-[var(--foreground)]",
        prominent ? "text-[0.9375rem]" : "text-[0.8125rem]",
        className,
      )}
      data-testid="sce-match-result"
      data-sce-match-center
      aria-label={`Ergebnis ${text}`}
    >
      {text}
    </span>
  );
}
