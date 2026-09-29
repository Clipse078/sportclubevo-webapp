import { validateCommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-validation";
import {
  zielgruppeDefinitionIsEmpty,
  type ZielgruppeEditorDefinition,
} from "@/lib/communication/zielgruppen/editor-model";
import { editorDefinitionToAudienceSpec } from "@/lib/communication/zielgruppen/rule-mapper";

const MAX_NAME_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 2000;

export function validateZielgruppeName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Name ist erforderlich.";
  if (trimmed.length > MAX_NAME_LENGTH) {
    return `Name darf höchstens ${MAX_NAME_LENGTH} Zeichen haben.`;
  }
  return null;
}

export function validateZielgruppeDescription(description: string | null | undefined): string | null {
  if (description == null || description === "") return null;
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return `Beschreibung darf höchstens ${MAX_DESCRIPTION_LENGTH} Zeichen haben.`;
  }
  return null;
}

export function validateZielgruppeEditorDefinition(
  definition: ZielgruppeEditorDefinition,
  roleKeys: string[],
): string | null {
  if (zielgruppeDefinitionIsEmpty(definition)) {
    return "Bitte mindestens ein Zielkriterium wählen oder «Ganze Organisation» aktivieren.";
  }

  const overlap = definition.includePersonIds.filter((id) =>
    definition.excludePersonIds.includes(id),
  );
  if (overlap.length > 0) {
    return "Eine Person kann nicht gleichzeitig eingeschlossen und ausgeschlossen werden.";
  }

  const externalOverlap = definition.includeExternalContactIds.filter((id) =>
    definition.excludeExternalContactIds.includes(id),
  );
  if (externalOverlap.length > 0) {
    return "Ein externer Kontakt kann nicht gleichzeitig eingeschlossen und ausgeschlossen werden.";
  }

  const audience = editorDefinitionToAudienceSpec(definition, roleKeys);
  return validateCommunicationAudienceSpec(audience);
}
