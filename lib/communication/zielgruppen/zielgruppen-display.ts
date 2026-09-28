/**
 * SCE-COMM-UX-06 — list/detail presentation helpers for Zielgruppen.
 */

import type { ZielgruppeEditorDefinition } from "@/lib/communication/zielgruppen/editor-model";
import { summarizeZielgruppeDefinition } from "@/lib/communication/zielgruppen/summary";

export const ZIELGRUPPEN_OVERVIEW_DESCRIPTION =
  "Empfängergruppen einmal definieren und für Mitteilungen und Kampagnen wiederverwenden.";

export const ZIELGRUPPE_PREVIEW_DELIVERY_NOTICE =
  "Die Vorschau zeigt die aktuelle Zielgruppen-Auflösung. Tatsächliche Zustellung kann durch Berechtigungen, Einwilligung, Safeguarding und Kanäle eingeschränkt sein.";

export const ZIELGRUPPE_MEMBERSHIP_NOT_CONSENT_NOTICE =
  "Zielgruppen-Mitgliedschaft ist nicht gleichbedeutend mit werblicher Zustimmung — Einwilligung wird beim Versand geprüft.";

export const ZIELGRUPPE_DYNAMIC_MEMBERSHIP_NOTICE =
  "Die Mitglieder dieser Zielgruppe werden beim Versand anhand der aktuellen Vereinsdaten ermittelt. Bereits versendete Kommunikation behält ihre historische Empfängerliste.";

export function formatZielgruppenListTimestamp(updatedAt: Date | string): string {
  const date = typeof updatedAt === "string" ? new Date(updatedAt) : updatedAt;
  return date.toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function resolveZielgruppeRuleCharacter(definition: ZielgruppeEditorDefinition): {
  label: string;
  srHint: string;
} {
  if (definition.wholeOrganisation) {
    return {
      label: "Ganze Organisation",
      srHint: "Strukturell der gesamte Verein",
    };
  }
  if (definition.compositionMode === "INTERSECTION") {
    return {
      label: "Alle Bedingungen",
      srHint: "Alle Bedingungen müssen zutreffen",
    };
  }
  const summary = summarizeZielgruppeDefinition(definition);
  if (summary.parts.length === 0) {
    return { label: "Noch offen", srHint: "Keine Zieldefinition" };
  }
  return {
    label: "Mindestens eine Bedingung",
    srHint: "Mindestens eine Bedingung",
  };
}
