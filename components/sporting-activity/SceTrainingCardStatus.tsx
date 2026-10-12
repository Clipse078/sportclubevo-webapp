import { SceMatchCardStatus } from "./SceMatchCardStatus";
import type { SceMatchCardStatusProps } from "./SceMatchCardStatus";

export type SceTrainingCardStatusProps = Omit<SceMatchCardStatusProps, "testId"> & {
  testId?: string;
};

export function SceTrainingCardStatus({
  testId = "sce-training-status",
  ...props
}: SceTrainingCardStatusProps) {
  return <SceMatchCardStatus testId={testId} {...props} />;
}
