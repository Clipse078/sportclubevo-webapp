/**
 * @vitest-environment jsdom
 *
 * SCE-ICONS-02 — premium Club (shield v1) and Spiele (circle + VS v4) navigation icons.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { SceIcon } from "@/components/design-system/icons/SceIcon";
import {
  CLUB_L1_SCE_ICON_BY_DOMAIN,
  TARGET_L1_SCE_ICONS,
} from "@/lib/nav/nav-ia-v2/target-ia-matrix";
import {
  getNavDestinationSceIconName,
  NAV_DESTINATION_SCE_ICON_BY_KEY,
} from "@/lib/nav/nav-destination-sce-icons";
import { SCE_APPROVED_MASTER_ASSETS } from "@/components/design-system/icons/masters/approved-hero-meta";
import { getVisibleNavSections } from "@/lib/nav/nav-config";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";

function readMaster(name: keyof typeof SCE_APPROVED_MASTER_ASSETS): string {
  return readFileSync(join(process.cwd(), SCE_APPROVED_MASTER_ASSETS[name]), "utf8");
}

describe("SCE-ICONS-02 premium navigation icon geometry", () => {
  it("maps canonical Club L1 and Spiele destinations to club and match masters", () => {
    expect(TARGET_L1_SCE_ICONS.club).toBe("club");
    expect(CLUB_L1_SCE_ICON_BY_DOMAIN.club).toBe("club");
    expect(getNavDestinationSceIconName("matchcenter")).toBe("match");
    expect(NAV_DESTINATION_SCE_ICON_BY_KEY.matchcenter).toBe("match");
  });

  it("implements Club Variante 1 as a minimal outline shield without interior divisions", () => {
    const clubSvg = readMaster("club");
    expect(clubSvg).toMatch(/M32 6l20 7v15/);
    expect(clubSvg).not.toMatch(/M32 12v39/);
    expect(clubSvg).not.toMatch(/M20 21h24/);
    expect(clubSvg).toMatch(/stroke="currentColor"/);
    expect(clubSvg).not.toMatch(/fill="currentColor"/);

    const { container } = render(<SceIcon name="club" size={20} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg?.innerHTML).toContain("M32 6l20 7v15");
    expect(svg?.innerHTML).not.toContain("M32 12v39");
  });

  it("implements Spiele Variante 4 as outlined circle with path-based VS (no football)", () => {
    const matchSvg = readMaster("match");
    expect(matchSvg).toMatch(/<circle cx="32" cy="32" r="21"/);
    expect(matchSvg).not.toMatch(/M18 13A23 23/);
    expect(matchSvg).not.toMatch(/<text[\s>]/i);
    expect(matchSvg).toMatch(/fill="currentColor"/);

    for (const size of [16, 20, 24] as const) {
      const { container } = render(<SceIcon name="match" size={size} />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("width", String(size));
      expect(svg?.querySelector("circle")).toBeTruthy();
    }
  });

  it("preserves Spiele nav label and route in planung section", () => {
    const adminKeys = Object.values(PERMISSIONS) as PermissionKey[];
    const sections = getVisibleNavSections(adminKeys, "club");
    const planung = sections.flatMap((s) => s.items).find((item) => item.key === "planung");
    expect(planung).toBeTruthy();
    const spiele = planung?.children?.find((c) => c.key === "matchcenter");
    expect(spiele?.label).toBe("Spiele");
    expect(spiele?.href).toMatch(/matchcenter/);
  });
});
