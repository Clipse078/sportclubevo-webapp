import {
  personalActionTypeChipClassName,
  personalActionTypePillText,
} from "@/lib/personal-actions/personal-action-type-semantics";
import type { PersonalActionSourceType } from "@/lib/personal-actions/types";
import { SceDenseMetaChip } from "@/components/sce/dense/SceDenseMetaChip";

type Props = {
  sourceType: PersonalActionSourceType;
  testId?: string;
};

export default function PersonalActionTypeChip({ sourceType, testId }: Props) {
  const label = personalActionTypePillText(sourceType);
  const className = personalActionTypeChipClassName(sourceType);
  if (!label || !className) return null;

  return (
    <SceDenseMetaChip
      label={label}
      className={className}
      testId={testId ?? `personal-action-type-${sourceType.toLowerCase()}`}
    />
  );
}
