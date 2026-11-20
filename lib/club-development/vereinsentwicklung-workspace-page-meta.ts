/**
 * Connected Vereinsentwicklung — per-view page chrome (title + breadcrumb leaf).
 */

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
  uebersicht:
    "Kurzüberblick über Ziele, Aufgaben, Umsetzung und anstehende Sitzungen — nur Daten, die Sie sehen dürfen.",
  strategien: "Vereinsstrategien im Überblick, Schwerpunkte und verknüpfte Ziele bearbeiten.",
  ziele: "Strategische Ziele pflegen, mit der Gesamtstrategie verknüpfen und Fortschritt verfolgen.",
  aufgaben: "Aufgaben aus Zielen und Vorhaben — Status, Verantwortliche und Umsetzung im Blick.",
  umsetzungsplanung: "Umsetzungsphasen, Sprint-Boards und ungeplante Aufgaben koordinieren.",
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