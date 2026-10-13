import { SceMatchCardStatus } from "./SceMatchCardStatus";
import type { SceMatchCardStatusProps } from "./SceMatchCardStatus";

export type SceClubEventCardStatusProps = Omit<SceMatchCardStatusProps, "testId"> & {
  testId?: string;
};

export function SceClubEventCardStatus({
  testId = "sce-club-event-status",
  ...props
}: SceClubEventCardStatusProps) {
  return <SceMatchCardStatus testId={testId} {...props} />;
}
