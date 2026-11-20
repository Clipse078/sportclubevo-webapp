/**
 * PO-approved Verein (Club domain) L2 navigation order — desktop panel + mobile discovery.
 */

import { describe, expect, it } from "vitest";
import {
  buildAppNavigationModelForUser,
  resolveDomainSecondaryNavItems,
  resolveExplorerDomainGroups,
} from "@/lib/nav/app-navigation-model";
import {
  CLUB_TARGET_L2_GROUPS,
  CLUB_VEREIN_L2_LABEL_ORDER,
} from "@/lib/nav/nav-ia-v2/target-ia-matrix";
import { PERMISSIONS } from "@/lib/permissions/permissions";

const CLUB_ADMIN_KEYS = Object.values(PERMISSIONS);

const VL_CAPABILITIES = { vereinsleitungWorkspace: true as const };

describe("Club Verein L2 navigation order", () => {
  it("defines CLUB_TARGET_L2_GROUPS in PO-approved label order", () => {
    expect(CLUB_TARGET_L2_GROUPS.map((group) => group.label)).toEqual([
      ...CLUB_VEREIN_L2_LABEL_ORDER,
    ]);
  });

  it("applies the same order to desktop domain secondary navigation", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club", VL_CAPABILITIES);
    const club = model.domains.find((d) => d.id === "club")!;
    const secondary = resolveDomainSecondaryNavItems(club);
    expect(secondary.map((item) => item.label)).toEqual([...CLUB_VEREIN_L2_LABEL_ORDER]);
  });

  it("applies the same order to mobile explorer L2 groups", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club", VL_CAPABILITIES);
    const club = model.domains.find((d) => d.id === "club")!;
    const groups = resolveExplorerDomainGroups(club)!;
    expect(groups.map((group) => group.label)).toEqual([...CLUB_VEREIN_L2_LABEL_ORDER]);
  });

  it("preserves Vereinsentwicklung L3 order in nav-config", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club", VL_CAPABILITIES);
    const club = model.domains.find((d) => d.id === "club")!;
    const hub = club.destinations.find((d) => d.key === "club-entwicklung");
    expect(hub?.children?.map((c) => c.label)).toEqual([
      "Übersicht",
      "Strategien",
      "Ziele",
      "Aufgaben",
      "Umsetzungsplanung",
    ]);
  });
});