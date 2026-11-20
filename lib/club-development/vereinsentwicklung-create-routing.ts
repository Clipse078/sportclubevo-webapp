/**
 * Full-page Vereinsentwicklung create routes (Strategie / Ziel) — preserves workspace context on return.
 */

import {
  buildStrategieUndZieleHref,
  CD_STRATEGIE_ZIELE_BASE,
  type CdStrategieZieleView,
} from "./vereinsentwicklung-workspace-routing";
import { CD_WORKSPACE_ORG_UNIT_QUERY } from "./vereinsentwicklung-connected-workspace";

export const CD_CREATE_RETURN_QUERY = "returnTo" as const;
export const CD_CREATE_CLUB_STRATEGY_QUERY = "clubStrategyId" as const;
export const CD_CREATE_LINK_FOCUS_QUERY = "linkFocus" as const;

export const CD_STRATEGIE_NEU_PATH = `${CD_STRATEGIE_ZIELE_BASE}/strategie/neu` as const;
export const CD_ZIEL_NEU_PATH = `${CD_STRATEGIE_ZIELE_BASE}/ziele/neu` as const;

export const CD_AUFGABEN_NEU_REFERENCE_PATH = "/dashboard/aufgaben/neu" as const;

export type VereinsentwicklungCreateNavParams = {
  orgUnitId?: string | null;
  ansicht?: CdStrategieZieleView;
  strategyId?: string | null;
  clubStrategyId?: string | null;
  linkFocus?: boolean;
  returnTo?: string | null;
};

function appendSearch(
  basePath: string,
  params?: VereinsentwicklungCreateNavParams,
): string {
  if (!params) return basePath;
  const sp = new URLSearchParams();
  const org = params.orgUnitId?.trim();
  if (org) sp.set(CD_WORKSPACE_ORG_UNIT_QUERY, org);
  const strategyId = params.strategyId?.trim();
  if (strategyId) sp.set("strategyId", strategyId);
  const clubStrategyId = params.clubStrategyId?.trim();
  if (clubStrategyId) sp.set(CD_CREATE_CLUB_STRATEGY_QUERY, clubStrategyId);
  if (params.linkFocus) sp.set(CD_CREATE_LINK_FOCUS_QUERY, "1");
  const returnTo = params.returnTo?.trim();
  if (returnTo) sp.set(CD_CREATE_RETURN_QUERY, returnTo);
  const q = sp.toString();
  return q ? `${basePath}?${q}` : basePath;
}

export function buildStrategieReturnHref(params: {
  orgUnitId?: string | null;
  strategyId?: string | null;
}): string {
  return buildStrategieUndZieleHref("strategie", {
    [CD_WORKSPACE_ORG_UNIT_QUERY]: params.orgUnitId ?? undefined,
    strategyId: params.strategyId ?? undefined,
  });
}

export function buildZieleReturnHref(params: { orgUnitId?: string | null }): string {
  return buildStrategieUndZieleHref("ziele", {
    [CD_WORKSPACE_ORG_UNIT_QUERY]: params.orgUnitId ?? undefined,
  });
}

export function buildVereinsentwicklungStrategieNeuHref(
  params?: VereinsentwicklungCreateNavParams,
): string {
  const returnTo =
    params?.returnTo?.trim() ??
    buildStrategieReturnHref({
      orgUnitId: params?.orgUnitId,
      strategyId: params?.strategyId,
    });
  return appendSearch(CD_STRATEGIE_NEU_PATH, { ...params, returnTo });
}

export function buildVereinsentwicklungZielNeuHref(
  params?: VereinsentwicklungCreateNavParams,
): string {
  const returnTo =
    params?.returnTo?.trim() ??
    (params?.clubStrategyId
      ? buildStrategieReturnHref({
          orgUnitId: params.orgUnitId,
          strategyId: params.clubStrategyId,
        })
      : buildZieleReturnHref({ orgUnitId: params?.orgUnitId }));
  return appendSearch(CD_ZIEL_NEU_PATH, {
    ...params,
    returnTo,
    linkFocus: params?.linkFocus ?? Boolean(params?.clubStrategyId),
  });
}

export function parseSafeReturnToHref(
  raw: string | undefined | null,
  fallback: string,
): string {
  const candidate = raw?.trim();
  if (!candidate) return fallback;
  if (!candidate.startsWith("/")) return fallback;
  if (candidate.startsWith("//")) return fallback;
  return candidate;
}

export function parseLinkFocusQuery(raw: string | undefined | null): boolean {
  const v = raw?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}