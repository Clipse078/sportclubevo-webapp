/**
 * SCE-COMM-EVO-06 — context-aware field availability for UI + API.
 */

import type { CommunicationContextRef } from "@/lib/communication/platform/communication-context";
import type {
  PersonalisationFieldAvailability,
  PersonalisationFieldDefinition,
} from "@/lib/communication/personalisation/types";
import { listPersonalisationFieldDefinitions } from "@/lib/communication/personalisation/field-registry";

export function resolveFieldAvailabilityForContext(
  field: PersonalisationFieldDefinition,
  contextRef: CommunicationContextRef,
  eventType: string | null | undefined,
): PersonalisationFieldAvailability {
  if (!field.implemented) return "UNAVAILABLE";
  if (field.requiredContextKinds?.length) {
    if (!field.requiredContextKinds.includes(contextRef.kind)) {
      return "CONTEXT_REQUIRED";
    }
    if (field.requiredContextKinds.includes("EVENT") && contextRef.kind !== "EVENT") {
      return "CONTEXT_REQUIRED";
    }
  }
  if (field.requiredEventTypes?.length) {
    if (contextRef.kind !== "EVENT") return "CONTEXT_REQUIRED";
    if (!eventType || !field.requiredEventTypes.includes(eventType as "TRAINING" | "MATCH" | "TOURNAMENT" | "OTHER")) {
      return "CONTEXT_REQUIRED";
    }
  }
  return "AVAILABLE";
}

export type PublicPersonalisationFieldDto = {
  key: string;
  label: string;
  category: string;
  description: string;
  valueType: string;
  availability: PersonalisationFieldAvailability;
  implemented: boolean;
  allowedMissingPolicies: string[];
  defaultMissingPolicy: string;
};

export function serializePersonalisationFieldsForClient(input: {
  contextRef: CommunicationContextRef;
  eventType?: string | null;
}): PublicPersonalisationFieldDto[] {
  return listPersonalisationFieldDefinitions().map((field) => ({
    key: field.key,
    label: field.labelDe,
    category: field.category,
    description: field.descriptionDe,
    valueType: field.valueType,
    availability: resolveFieldAvailabilityForContext(field, input.contextRef, input.eventType ?? null),
    implemented: field.implemented,
    allowedMissingPolicies: [...field.allowedMissingPolicies],
    defaultMissingPolicy: field.defaultMissingPolicy,
  }));
}
