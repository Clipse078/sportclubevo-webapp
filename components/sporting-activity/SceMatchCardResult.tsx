import { cn } from "@/lib/cn";
import type {
  SceActivityPresentationDensity,
  SceMatchPresentationModel,
} from "@/lib/sporting-activity-presentation/canonical/types";
import { SceMatchScorePresentation } from "./SceMatchScorePresentation";

export type SceMatchCardResultProps = {
  model: SceMatchPresentationModel;
  density: SceActivityPresentationDensity;
  className?: string;
};

export function SceMatchCardResult({ model, density, className }: SceMatchCardResultProps) {
  return (
    <SceMatchScorePresentation
      model={model}
      density={density}
      className={cn(className)}
      presentation="legacy-inline"
    />
  );
}
