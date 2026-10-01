import type { PersonalProgrammeItem } from "@/lib/personal-agenda/personal-programme-types";
import type { PersonalDashboardReadModelPayloadV1 } from "./types";
import { PERSONAL_DASHBOARD_READ_MODEL_PAYLOAD_VERSION } from "./constants";

type JsonProgrammeItem = Omit<PersonalProgrammeItem, "startsAt" | "endsAt"> & {
  startsAt: string;
  endsAt?: string | null;
};

function serializeProgrammeItem(item: PersonalProgrammeItem): JsonProgrammeItem {
  return {
    ...item,
    startsAt: item.startsAt.toISOString(),
    endsAt: item.endsAt ? item.endsAt.toISOString() : item.endsAt ?? null,
  };
}

function deserializeProgrammeItem(item: JsonProgrammeItem): PersonalProgrammeItem {
  const { startsAt, endsAt, ...rest } = item;
  return {
    ...rest,
    startsAt: new Date(startsAt),
    endsAt: endsAt ? new Date(endsAt) : null,
  };
}

export function encodePersonalDashboardReadModelPayload(
  payload: PersonalDashboardReadModelPayloadV1,
): Record<string, unknown> {
  return {
    ...payload,
    programme: {
      supported: payload.programme.supported,
      items: payload.programme.items.map(serializeProgrammeItem),
    },
  };
}

export function parsePersonalDashboardReadModelPayload(
  raw: unknown,
): PersonalDashboardReadModelPayloadV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const version = record.v;
  if (version !== 1 && version !== PERSONAL_DASHBOARD_READ_MODEL_PAYLOAD_VERSION) return null;
  if (!record.scopeHints || typeof record.scopeHints !== "object") return null;
  if (!record.programme || typeof record.programme !== "object") return null;
  if (!record.personalWork || typeof record.personalWork !== "object") return null;

  const programme = record.programme as {
    supported?: boolean;
    items?: JsonProgrammeItem[];
  };
  const personalWork = record.personalWork as PersonalDashboardReadModelPayloadV1["personalWork"];
  const scopeHints = record.scopeHints as PersonalDashboardReadModelPayloadV1["scopeHints"];

  if (!Array.isArray(programme.items)) return null;
  if (!Array.isArray(personalWork.attentionItems)) return null;
  if (!Array.isArray(personalWork.taskPreview)) return null;

  return {
    v: version as PersonalDashboardReadModelPayloadV1["v"],
    scopeHints,
    programme: {
      supported: programme.supported === true,
      items: programme.items.map(deserializeProgrammeItem),
    },
    personalWork,
  };
}
