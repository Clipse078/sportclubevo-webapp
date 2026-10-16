import { expect } from "vitest";
import type { SceIconRegistryName } from "@/components/design-system/icons/registry";
import { SCE_ICON_REGISTRY } from "@/components/design-system/icons/registry";
import { SCE_APPROVED_MASTER_ICON_NAMES } from "@/components/design-system/icons/masters/approved-hero-meta";
import { NAV_DESTINATION_PROVISIONAL_REGISTRY_ICONS } from "@/lib/nav/nav-test-contract";
import { NAV_DESTINATION_SCE_ICON_BY_KEY } from "@/lib/nav/nav-destination-sce-icons";

export function expectNavDestinationUsesRegistryMaster(iconName: SceIconRegistryName) {
  const entry = SCE_ICON_REGISTRY[iconName];
  expect(entry, iconName).toBeDefined();
  if (NAV_DESTINATION_PROVISIONAL_REGISTRY_ICONS.has(iconName)) {
    expect(entry.geometrySource).not.toBe("approved-master");
    return;
  }
  expect(entry.geometrySource).toBe("approved-master");
  expect(SCE_APPROVED_MASTER_ICON_NAMES).toContain(iconName);
}

export function forEachNavDestinationIconMapping(
  fn: (navKey: string, iconName: SceIconRegistryName) => void,
) {
  for (const [navKey, iconName] of Object.entries(NAV_DESTINATION_SCE_ICON_BY_KEY)) {
    fn(navKey, iconName);
  }
}
