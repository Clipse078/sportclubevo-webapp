/**
 * Connected Vereinsentwicklung — per-view page chrome (title + breadcrumb leaf).
 */

import { CD_CONNECTED_WORKSPACE_VIEW_COPY } from "./product-copy";
import {
  CD_CONNECTED_VIEW_LABELS,
  type CdConnectedView,
} from "./vereinsentwicklung-connected-workspace";
import { parseStrategieZieleView, parseVorhabenUmsetzungView } from "./vereinsentwicklung-workspace-routing";

export const CD_CONNECTED_WORKSPACE_EYEBROW = "Vereinsentwicklung" as const;

export const CD_CONNECTED_WORKSPACE_BREADCRUMB_ROOT = {
  label: "Verein",
  href: "/vereinsleitung",
} as const;

export const CD_CONNECTED_WORKSPACE_BREADCRUMB_HUB = {
  label: "Vereinsentwicklung",
  href: "/vereinsleitung/club-entwicklung",
} as const;

const VIEW_DESCRIPTIONS: Record<CdConnectedView, string> = {
  uebersicht: CD_CONNECTED_WORKSPACE_VIEW_COPY.uebersicht,
  strategien: "Vereinsstrategien im Überblick, Schwerpunkte und verknüpfte Ziele bearbeiten.",
  ziele: "Strategische Ziele pflegen, mit der Gesamtstrategie verknüpfen und Fortschritt verfolgen.",
  aufgaben: CD_CONNECTED_WORKSPACE_VIEW_COPY.aufgaben,
  umsetzungsplanung: CD_CONNECTED_WORKSPACE_VIEW_COPY.umsetzungsplanung,
};

export function resolveConnectedViewFromStrategieUndZieleAnsicht(
  ansicht: string | undefined | null,
): CdConnectedView {
  return parseStrategieZieleView(ansicht) === "ziele" ? "ziele" : "strategien";
}

export function resolveConnectedViewFromVorhabenUndUmsetzungAnsicht(
  ansicht: string | undefined | null,
): CdConnectedView {
  const view = parseVorhabenUmsetzungView(ansicht);
  if (view === "umsetzungsphasen") return "umsetzungsplanung";
  return "aufgaben";
}

export function connectedWorkspacePageMeta(view: CdConnectedView): {
  title: string;
  description: string;
  breadcrumbs: { label: string; href?: string }[];
} {
  return {
    title: CD_CONNECTED_VIEW_LABELS[view],
    description: VIEW_DESCRIPTIONS[view],
    breadcrumbs: [
      CD_CONNECTED_WORKSPACE_BREADCRUMB_ROOT,
      CD_CONNECTED_WORKSPACE_BREADCRUMB_HUB,
      { label: CD_CONNECTED_VIEW_LABELS[view] },
    ],
  };
}