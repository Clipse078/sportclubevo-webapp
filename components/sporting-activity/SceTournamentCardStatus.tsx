import { SceMatchCardStatus } from "./SceMatchCardStatus";
import type { SceMatchCardStatusProps } from "./SceMatchCardStatus";

export type SceTournamentCardStatusProps = Omit<SceMatchCardStatusProps, "testId"> & {
  testId?: string;
};

export function SceTournamentCardStatus({
  testId = "sce-tournament-status",
  ...props
}: SceTournamentCardStatusProps) {
  return <SceMatchCardStatus testId={testId} {...props} />;
}
