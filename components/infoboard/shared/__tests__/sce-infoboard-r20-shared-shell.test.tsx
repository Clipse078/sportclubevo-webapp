/**
 * @vitest-environment jsdom
 *
 * SCE-INFOBOARD-V2-01-R20 — shared header/footer shell consistency (Screen 1 / Screen 2).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { InfoboardScreen1 } from "@/components/infoboard/screen1/InfoboardScreen1";
import { InfoboardScreen2 } from "@/components/infoboard/screen2/InfoboardScreen2";
import {
  KIOSK_SHELL_MEASUREMENT_CONTRACT,
  KIOSK_SHELL_HEADER_HEIGHT_PX,
  KIOSK_SHELL_FOOTER_HEIGHT_PX,
} from "@/lib/infoboard/kiosk-shell-sizing";
import { KIOSK_SHELL_TENANT_NAME_TYPOGRAPHY } from "@/lib/infoboard/kiosk-shell-presentation";
import type { InfoboardScreen1Feed } from "@/lib/publishing/event-types";
import type { InfoboardScreen2Feed } from "@/lib/publishing/event-types";

const REPO_ROOT = process.cwd();

function readRepoFile(path: string): string {
  return readFileSync(join(REPO_ROOT, path), "utf8");
}

function makeScreen1Feed(tenantName: string): InfoboardScreen1Feed {
  return {
    generatedAt: "2026-09-12T08:00:00.000Z",
    tenant: {
      id: "tenant-a",
      key: "club-a",
      name: tenantName,
      timezone: "Europe/Zurich",
    },
    displayDate: "2026-09-12",
    isStale: false,
    wochenplanVariantBadge: null,
    current: [],
    next: [],
    later: [],
    isEmpty: true,
    emptyStateReason: "NO_EVENTS_TODAY",
  };
}

function makeScreen2Feed(tenantName: string): InfoboardScreen2Feed {
  return {
    generatedAt: "2026-09-12T08:00:00.000Z",
    tenant: {
      id: "tenant-b",
      key: "club-b",
      name: tenantName,
      timezone: "Europe/Zurich",
    },
    displayDate: "2026-09-12",
    isStale: false,
    facilityName: "Test Facility",
    pitches: [],
    dressingRooms: [],
    unallocated: [],
  };
}

function shellPropsFromScreen(path: "screen1" | "screen2"): string {
  return readRepoFile(`components/infoboard/${path}/InfoboardScreen${path === "screen1" ? "1" : "2"}.tsx`);
}

afterEach(() => {
  cleanup();
});

describe("R20 shared kiosk shell — source parity", () => {
  it("routes both screens through the same ambient + theme presentation helpers", () => {
    const screen1 = shellPropsFromScreen("screen1");
    const screen2 = shellPropsFromScreen("screen2");

    for (const source of [screen1, screen2]) {
      expect(source).toContain("resolveKioskShellThemePresentation");
      expect(source).toContain("KIOSK_SHELL_HEADER_AMBIENT");
      expect(source).toContain("KIOSK_SHELL_FOOTER_AMBIENT");
      expect(source).toContain("venueHeaderBranding={venueHeaderBranding}");
      expect(source).toContain("shellTheme={shellTheme}");
    }
  });

  it("preserves R19 Platz single-line regression file", () => {
    expect(
      readRepoFile(
        "components/infoboard/screen1/__tests__/screen1-r19-platz-single-line.test.tsx",
      ),
    ).toContain("R19");
  });
});

describe("R20 shared kiosk shell — runtime parity", () => {
  it("renders bold italic tenant identity in LIGHT and DARK on both screens", () => {
    const themes = ["LIGHT", "DARK"] as const;

    for (const theme of themes) {
      const view1 = render(
        <InfoboardScreen1
          feed={makeScreen1Feed("SC Dynamic One")}
          currentTimeIso="2026-09-12T08:00:00.000Z"
          theme={theme}
          branding={{ tenantPrimaryColor: "#001122", tenantSecondaryColor: "#334455" }}
        />,
      );
      const club1 = view1.getByTestId("kiosk-header-club-name");
      expect(club1.textContent).toContain("SC Dynamic One");
      expect(club1.getAttribute("data-venue-header-identity")).toBe("true");
      expect(club1.style.fontStyle).toBe(KIOSK_SHELL_TENANT_NAME_TYPOGRAPHY.fontStyle);
      expect(club1.style.fontWeight).toBe(String(KIOSK_SHELL_TENANT_NAME_TYPOGRAPHY.fontWeight));
      expect(view1.getByTestId("kiosk-shell-header-bar").getAttribute("data-venue-header-ambient")).toBe(
        "true",
      );
      view1.unmount();

      const view2 = render(
        <InfoboardScreen2
          feed={makeScreen2Feed("SC Dynamic Two")}
          currentTimeIso="2026-09-12T08:00:00.000Z"
          theme={theme}
          branding={{ tenantPrimaryColor: "#001122", tenantSecondaryColor: "#334455" }}
        />,
      );
      const club2 = view2.getByTestId("kiosk-header-club-name");
      expect(club2.textContent).toContain("SC Dynamic Two");
      expect(club2.getAttribute("data-venue-header-identity")).toBe("true");
      expect(club2.style.fontStyle).toBe(KIOSK_SHELL_TENANT_NAME_TYPOGRAPHY.fontStyle);
      expect(club2.style.fontWeight).toBe(String(KIOSK_SHELL_TENANT_NAME_TYPOGRAPHY.fontWeight));
      expect(view2.getByTestId("kiosk-shell-header-bar").getAttribute("data-shell-theme")).toBe(
        theme.toLowerCase(),
      );
      expect(view2.getByTestId("kiosk-shell-footer").getAttribute("data-venue-jumbotron-ambient")).toBe(
        "true",
      );
      view2.unmount();
    }
  });

  it("uses the canonical header/footer geometry tokens on both screens", () => {
    render(
      <InfoboardScreen1
        feed={makeScreen1Feed("Club A")}
        currentTimeIso="2026-09-12T08:00:00.000Z"
      />,
    );
    const header1 = screen.getByTestId("kiosk-shell-header-bar");
    const footer1 = screen.getByTestId("kiosk-shell-footer");
    expect(header1.style.height).toContain(String(KIOSK_SHELL_HEADER_HEIGHT_PX));
    expect(footer1.style.minHeight).toContain(String(KIOSK_SHELL_FOOTER_HEIGHT_PX));
    cleanup();

    render(
      <InfoboardScreen2
        feed={makeScreen2Feed("Club B")}
        currentTimeIso="2026-09-12T08:00:00.000Z"
      />,
    );
    const header2 = screen.getByTestId("kiosk-shell-header-bar");
    const footer2 = screen.getByTestId("kiosk-shell-footer");
    expect(header2.style.height).toContain(String(KIOSK_SHELL_HEADER_HEIGHT_PX));
    expect(footer2.style.minHeight).toContain(String(KIOSK_SHELL_FOOTER_HEIGHT_PX));
    expect(KIOSK_SHELL_MEASUREMENT_CONTRACT.headerHeightPx).toBe(KIOSK_SHELL_HEADER_HEIGHT_PX);
    expect(KIOSK_SHELL_MEASUREMENT_CONTRACT.footerHeightPx).toBe(KIOSK_SHELL_FOOTER_HEIGHT_PX);
  });
});
