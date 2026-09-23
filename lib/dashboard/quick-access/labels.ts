import type { QuickAccessCatalogEntry } from "./types";

type MessageTree = Record<string, unknown>;

function lookupMessage(messages: MessageTree, key: string): string | undefined {
  const parts = key.split(".");
  let node: unknown = messages;
  for (const part of parts) {
    if (!node || typeof node !== "object" || !(part in (node as MessageTree))) {
      return undefined;
    }
    node = (node as MessageTree)[part];
  }
  return typeof node === "string" ? node : undefined;
}

/** Fallback labels when i18n entry missing (German nav labels / catalog titles). */
const FALLBACK_LABELS: Record<string, string> = {
  navigation_wochenplanner: "Wochenplaner",
  navigation_aufgaben: "Aufgaben",
  navigation_matchcenter: "Spiele",
  navigation_tournamentcenter: "Turniere",
  navigation_veranstaltungen: "Veranstaltungen",
  navigation_workspace: "Dokumente",
  navigation_personen: "Personen",
  navigation_anmeldungen: "Anmeldungen",
  navigation_registrierungen: "Registrierungen",
  action_create_training: "Training",
  action_create_match: "Spiel",
  action_create_tournament: "Turnier",
  action_create_event: "Veranstaltung",
  action_create_news: "News",
  action_create_person: "Person",
};

let cachedMessages: Record<string, MessageTree> | null = null;

async function loadMessages(locale: string): Promise<MessageTree> {
  if (!cachedMessages) {
    const [de, en, fr, it] = await Promise.all([
      import("@/messages/de.json").then((m) => m.default as MessageTree),
      import("@/messages/en.json").then((m) => m.default as MessageTree),
      import("@/messages/fr.json").then((m) => m.default as MessageTree),
      import("@/messages/it.json").then((m) => m.default as MessageTree),
    ]);
    cachedMessages = { de, en, fr, it };
  }
  const lang = locale.startsWith("de")
    ? "de"
    : locale.startsWith("fr")
      ? "fr"
      : locale.startsWith("it")
        ? "it"
        : "en";
  return cachedMessages[lang] ?? cachedMessages.en;
}

export async function getQuickAccessLabelAsync(
  entry: QuickAccessCatalogEntry,
  locale: string,
): Promise<string> {
  const messages = await loadMessages(locale);
  const fromMessages = lookupMessage(messages, entry.messageKey);
  if (fromMessages) {
    return fromMessages;
  }
  const fallbackKey = entry.messageKey.replace("PersonalDashboard.quickAccess.entries.", "");
  return FALLBACK_LABELS[fallbackKey] ?? entry.iconLabel;
}

/** Sync label resolver for tests and server paths that preload messages. */
export function getQuickAccessLabel(entry: QuickAccessCatalogEntry, locale: string): string {
  const lang = locale.startsWith("de")
    ? "de"
    : locale.startsWith("fr")
      ? "fr"
      : locale.startsWith("it")
        ? "it"
        : "en";
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const messages = require(`@/messages/${lang}.json`) as MessageTree;
    const fromMessages = lookupMessage(messages, entry.messageKey);
    if (fromMessages) {
      return fromMessages;
    }
  } catch {
    // ignore
  }
  const fallbackKey = entry.messageKey.replace("PersonalDashboard.quickAccess.entries.", "");
  return FALLBACK_LABELS[fallbackKey.replace(/\./g, "_")] ?? entry.iconLabel;
}
