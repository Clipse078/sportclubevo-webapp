import {
  SCE_ICON_REGISTRY,
  type SceIconRegistryName,
} from "./registry";

const ALIAS_TO_CANONICAL: Map<string, SceIconRegistryName> = new Map();

for (const name of Object.keys(SCE_ICON_REGISTRY) as SceIconRegistryName[]) {
  ALIAS_TO_CANONICAL.set(name, name);
  const entry = SCE_ICON_REGISTRY[name];
  for (const alias of entry.aliases) {
    ALIAS_TO_CANONICAL.set(alias.toLowerCase(), name);
  }
}

/** Resolve a registry name or alias to the canonical icon name. */
export function resolveSceIconName(
  nameOrAlias: string,
): SceIconRegistryName | null {
  const key = nameOrAlias.trim();
  if (key in SCE_ICON_REGISTRY) {
    return key as SceIconRegistryName;
  }
  return ALIAS_TO_CANONICAL.get(key.toLowerCase()) ?? null;
}
