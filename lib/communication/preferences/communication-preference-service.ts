import type {
  CommunicationPreferenceCategory as PrismaCommunicationPreferenceCategory,
  CommunicationPreferenceChannel as PrismaCommunicationPreferenceChannel,
  CommunicationPreferenceExplicitState,
  CommunicationPreferenceChangeSource,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { CommunicationPreferenceCategory } from "@/lib/communication/platform/preference-categories";
import {
  COMMUNICATION_PREFERENCE_CATEGORIES,
  isCommunicationPreferenceCategory,
} from "@/lib/communication/platform/preference-categories";
import type { CommunicationChannel } from "@/lib/communication/platform/channels";
import {
  isUserConfigurablePreference,
  mergeExplicitWithDefault,
} from "@/lib/communication/preferences/preference-defaults";
import { recordCommunicationPreferenceAudit } from "@/lib/communication/preferences/communication-preference-audit";

export type CommunicationPreferenceSettingDto = {
  category: CommunicationPreferenceCategory;
  channel: CommunicationChannel;
  effectiveState: "DEFAULT" | "ENABLED" | "DISABLED" | "REQUIRED";
  userConfigurable: boolean;
  explicitState: "ENABLED" | "DISABLED" | null;
};

const UX_CHANNELS: CommunicationChannel[] = ["IN_APP", "PUSH", "EMAIL"];

const UX_CATEGORIES: CommunicationPreferenceCategory[] = [
  "CLUB_OPERATIONAL",
  "CLUB_INFORMATION",
  "SPONSOR_COMMERCIAL",
];

function toPrismaCategory(
  category: CommunicationPreferenceCategory,
): PrismaCommunicationPreferenceCategory {
  return category as PrismaCommunicationPreferenceCategory;
}

function toPrismaChannel(channel: CommunicationChannel): PrismaCommunicationPreferenceChannel {
  return channel as PrismaCommunicationPreferenceChannel;
}

export async function listCommunicationPreferencesForUser(
  tenantId: string,
  userId: string,
): Promise<CommunicationPreferenceSettingDto[]> {
  const stored = await prisma.userCommunicationPreference.findMany({
    where: { tenantId, userId },
  });
  const byKey = new Map(
    stored.map((row) => [`${row.category}:${row.channel}`, row.explicitState]),
  );

  const settings: CommunicationPreferenceSettingDto[] = [];
  for (const category of UX_CATEGORIES) {
    for (const channel of UX_CHANNELS) {
      const explicit = (byKey.get(`${category}:${channel}`) as "ENABLED" | "DISABLED" | undefined) ?? null;
      const effectiveState = mergeExplicitWithDefault({ category, channel, explicit });
      settings.push({
        category,
        channel,
        effectiveState,
        userConfigurable: isUserConfigurablePreference({ category, channel }),
        explicitState: explicit,
      });
    }
  }
  return settings;
}

export async function loadExplicitUserPreferenceMap(input: {
  tenantId: string;
  userIds: readonly string[];
  categories?: readonly CommunicationPreferenceCategory[];
  channels?: readonly CommunicationChannel[];
}): Promise<Map<string, "ENABLED" | "DISABLED">> {
  if (input.userIds.length === 0) return new Map();
  const rows = await prisma.userCommunicationPreference.findMany({
    where: {
      tenantId: input.tenantId,
      userId: { in: [...input.userIds] },
      ...(input.categories?.length
        ? { category: { in: input.categories.map(toPrismaCategory) } }
        : {}),
      ...(input.channels?.length
        ? { channel: { in: input.channels.map(toPrismaChannel) } }
        : {}),
    },
    select: {
      userId: true,
      category: true,
      channel: true,
      explicitState: true,
    },
  });
  const map = new Map<string, "ENABLED" | "DISABLED">();
  for (const row of rows) {
    map.set(`${row.userId}:${row.category}:${row.channel}`, row.explicitState);
  }
  return map;
}

export async function loadExplicitSponsorContactPreferenceMap(input: {
  tenantId: string;
  sponsorContactIds: readonly string[];
  category?: CommunicationPreferenceCategory;
  channel?: CommunicationChannel;
}): Promise<Map<string, "ENABLED" | "DISABLED">> {
  if (input.sponsorContactIds.length === 0) return new Map();
  const rows = await prisma.sponsorContactCommunicationPreference.findMany({
    where: {
      tenantId: input.tenantId,
      sponsorContactId: { in: [...input.sponsorContactIds] },
      ...(input.category ? { category: toPrismaCategory(input.category) } : {}),
      ...(input.channel ? { channel: toPrismaChannel(input.channel) } : {}),
    },
    select: {
      sponsorContactId: true,
      category: true,
      channel: true,
      explicitState: true,
    },
  });
  const map = new Map<string, "ENABLED" | "DISABLED">();
  for (const row of rows) {
    map.set(`${row.sponsorContactId}:${row.category}:${row.channel}`, row.explicitState);
  }
  return map;
}

export async function upsertUserCommunicationPreference(input: {
  tenantId: string;
  userId: string;
  actorUserId: string;
  category: string;
  channel: string;
  explicitState: "ENABLED" | "DISABLED";
  source?: CommunicationPreferenceChangeSource;
}): Promise<CommunicationPreferenceSettingDto> {
  if (!isCommunicationPreferenceCategory(input.category)) {
    throw new Error("invalid category");
  }
  if (!UX_CHANNELS.includes(input.channel as CommunicationChannel)) {
    throw new Error("invalid channel");
  }
  const category = input.category;
  const channel = input.channel as CommunicationChannel;
  if (!isUserConfigurablePreference({ category, channel })) {
    throw new Error("preference not configurable");
  }

  const existing = await prisma.userCommunicationPreference.findUnique({
    where: {
      tenantId_userId_category_channel: {
        tenantId: input.tenantId,
        userId: input.userId,
        category: toPrismaCategory(category),
        channel: toPrismaChannel(channel),
      },
    },
  });

  const row = await prisma.userCommunicationPreference.upsert({
    where: {
      tenantId_userId_category_channel: {
        tenantId: input.tenantId,
        userId: input.userId,
        category: toPrismaCategory(category),
        channel: toPrismaChannel(channel),
      },
    },
    create: {
      tenantId: input.tenantId,
      userId: input.userId,
      category: toPrismaCategory(category),
      channel: toPrismaChannel(channel),
      explicitState: input.explicitState as CommunicationPreferenceExplicitState,
      source: input.source ?? "USER_SELF_SERVICE",
    },
    update: {
      explicitState: input.explicitState as CommunicationPreferenceExplicitState,
      source: input.source ?? "USER_SELF_SERVICE",
    },
  });

  await recordCommunicationPreferenceAudit({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    subjectKind: "USER",
    subjectId: input.userId,
    category,
    channel,
    previousExplicitState: existing?.explicitState ?? null,
    newExplicitState: row.explicitState,
    source: row.source,
  });

  return {
    category,
    channel,
    effectiveState: mergeExplicitWithDefault({
      category,
      channel,
      explicit: row.explicitState,
    }),
    userConfigurable: true,
    explicitState: row.explicitState,
  };
}

export async function upsertSponsorContactCommunicationPreference(input: {
  tenantId: string;
  sponsorContactId: string;
  actorUserId: string | null;
  channel: CommunicationChannel;
  explicitState: "ENABLED" | "DISABLED";
  source?: CommunicationPreferenceChangeSource;
}): Promise<void> {
  const category: CommunicationPreferenceCategory = "SPONSOR_COMMERCIAL";
  const contact = await prisma.sponsorContact.findFirst({
    where: { id: input.sponsorContactId, tenantId: input.tenantId },
    select: { id: true },
  });
  if (!contact) {
    throw new Error("sponsor contact not found");
  }

  const existing = await prisma.sponsorContactCommunicationPreference.findUnique({
    where: {
      tenantId_sponsorContactId_category_channel: {
        tenantId: input.tenantId,
        sponsorContactId: input.sponsorContactId,
        category: toPrismaCategory(category),
        channel: toPrismaChannel(input.channel),
      },
    },
  });

  const row = await prisma.sponsorContactCommunicationPreference.upsert({
    where: {
      tenantId_sponsorContactId_category_channel: {
        tenantId: input.tenantId,
        sponsorContactId: input.sponsorContactId,
        category: toPrismaCategory(category),
        channel: toPrismaChannel(input.channel),
      },
    },
    create: {
      tenantId: input.tenantId,
      sponsorContactId: input.sponsorContactId,
      category: toPrismaCategory(category),
      channel: toPrismaChannel(input.channel),
      explicitState: input.explicitState as CommunicationPreferenceExplicitState,
      source: input.source ?? "ADMIN",
    },
    update: {
      explicitState: input.explicitState as CommunicationPreferenceExplicitState,
      source: input.source ?? "ADMIN",
    },
  });

  await recordCommunicationPreferenceAudit({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    subjectKind: "SPONSOR_CONTACT",
    subjectId: input.sponsorContactId,
    category,
    channel: input.channel,
    previousExplicitState: existing?.explicitState ?? null,
    newExplicitState: row.explicitState,
    source: row.source,
  });
}

export function allCommunicationPreferenceCategories(): readonly CommunicationPreferenceCategory[] {
  return COMMUNICATION_PREFERENCE_CATEGORIES;
}
