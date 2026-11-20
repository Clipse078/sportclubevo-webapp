import { CD_WORKSPACE_ORG_UNIT_QUERY } from "./vereinsentwicklung-connected-workspace";

const AUFGABEN_NEU = "/dashboard/aufgaben/neu" as const;
const TARGET_CONTEXT_TYPE = "TARGET" as const;

export function buildVereinsentwicklungTargetTaskCreateHref(input: {
  targetId: string;
  returnTo?: string | null;
  orgUnitId?: string | null;
}): string {
  const params = new URLSearchParams({
    contextType: TARGET_CONTEXT_TYPE,
    contextId: input.targetId.trim(),
  });
  const returnTo = input.returnTo?.trim();
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    params.set("returnTo", returnTo);
  }
  const org = input.orgUnitId?.trim();
  if (org) params.set(CD_WORKSPACE_ORG_UNIT_QUERY, org);
  return `${AUFGABEN_NEU}?${params.toString()}`;
}

export function buildZielDetailHref(targetId: string, orgUnitId?: string | null): string {
  const base = `/vereinsleitung/targets/${encodeURIComponent(targetId)}`;
  const org = orgUnitId?.trim();
  if (!org) return base;
  return `${base}?${CD_WORKSPACE_ORG_UNIT_QUERY}=${encodeURIComponent(org)}`;
}