import type { SceSelectorAuthorizationContext } from "@/lib/sce/list-selector/selector-authorization-context";
import { allowedSourceTypesForSelectorAuthorizationContext } from "@/lib/sce/list-selector/selector-authorization-context";
import type { SceSelectorSourceType } from "@/lib/sce/list-selector/types";

export type SceRecipientSelectorProfile = {
  authContext: SceSelectorAuthorizationContext;
  sourceTypes: readonly SceSelectorSourceType[];
  searchPlaceholder: string;
  dialogTitle: string;
  dialogDescription?: string;
  addButtonLabel: string;
};

export const SCE_RECIPIENT_SELECTOR_REQUIREMENT: SceRecipientSelectorProfile = {
  authContext: "REQUIREMENT_AUDIENCE",
  sourceTypes: ["PERSON", "TEAM", "ORG_UNIT", "ROLE", "TARGET_GROUP"],
  searchPlaceholder: "Personen, Teams, Organisation, Rollen oder Zielgruppen suchen …",
  dialogTitle: "Empfänger auswählen",
  dialogDescription: "Wer soll die Anforderung bestätigen?",
  addButtonLabel: "Empfänger hinzufügen",
};

export const SCE_RECIPIENT_SELECTOR_WORKSPACE_ACCESS: SceRecipientSelectorProfile = {
  authContext: "WORKSPACE_ACCESS",
  sourceTypes: allowedSourceTypesForSelectorAuthorizationContext("WORKSPACE_ACCESS"),
  searchPlaceholder: "Organisation, Teams, Rollen/Funktionen oder Personen suchen …",
  dialogTitle: "Auswahl hinzufügen",
  dialogDescription: "Wer erhält Zugriff?",
  addButtonLabel: "Auswahl hinzufügen",
};
