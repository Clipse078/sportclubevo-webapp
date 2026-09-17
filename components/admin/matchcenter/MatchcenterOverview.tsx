import type { ComponentProps } from "react";
import SpieleManagementWorkspace from "./SpieleManagementWorkspace";

export type { MatchcenterMonthWindowLike } from "./SpieleManagementWorkspace";

type MatchcenterOverviewProps = ComponentProps<typeof SpieleManagementWorkspace>;

/**
 * @deprecated SPIELE-UX-01 — use SpieleManagementWorkspace. Kept for existing imports/tests.
 */
export default function MatchcenterOverview(props: MatchcenterOverviewProps) {
  return <SpieleManagementWorkspace {...props} />;
}
