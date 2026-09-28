// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  SCE_AUTHENTICATED_APP_BACKGROUND_URL,
  SCE_APPROVED_AUTHENTICATED_APP_BACKGROUND_SHA256,
} from "@/lib/shell/sce-app-background";
import {
  canRenderSideBySideSplit,
  clampListSplitPercent,
  defaultInboxWorkspacePreference,
  defaultListSplitPercentForLayout,
  INBOX_WORKSPACE_DENSITIES,
  INBOX_WORKSPACE_LAYOUTS,
  inboxLayoutIsMasterDetailOnDesktop,
  inboxLayoutUsesHorizontalSplit,
  inboxLayoutUsesVerticalSplit,
} from "@/lib/communication/inbox/inbox-workspace-preferences";
import {
  loadCommunicationInboxWorkspacePreference,
  resetCommunicationInboxWorkspacePreference,
  saveCommunicationInboxWorkspacePreference,
} from "@/lib/communication/inbox/inbox-workspace-preference-service";
import { CommunicationInboxPaneResizeHandle } from "@/components/admin/communication/inbox/CommunicationInboxPaneResizeHandle";
import { CommunicationInboxViewControl } from "@/components/admin/communication/inbox/CommunicationInboxViewControl";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    userCommunicationInboxWorkspacePref: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db/prisma";

describe("SCE-COMM-INBOX-02 flexible inbox views", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("preferences", () => {
    it("defaults to Standard layout and density without stored row", async () => {
      vi.mocked(prisma.userCommunicationInboxWorkspacePref.findUnique).mockResolvedValue(null);
      const pref = await loadCommunicationInboxWorkspacePreference("tenant-a", "user-a");
      expect(pref.layout).toBe("STANDARD");
      expect(pref.density).toBe("STANDARD");
      expect(pref.listSplitPercent).toBe(38);
      expect(pref.hasStoredPreference).toBe(false);
    });

    it("isolates User A preference from User B", async () => {
      vi.mocked(prisma.userCommunicationInboxWorkspacePref.findUnique)
        .mockResolvedValueOnce({
          layout: "READING_LARGE",
          density: "COMPACT",
          listSplitPercent: 33,
        })
        .mockResolvedValueOnce(null);
      const userA = await loadCommunicationInboxWorkspacePreference("tenant-a", "user-a");
      const userB = await loadCommunicationInboxWorkspacePreference("tenant-a", "user-b");
      expect(userA.layout).toBe("READING_LARGE");
      expect(userB.layout).toBe("STANDARD");
    });

    it("rejects invalid layout, density, and split on write", async () => {
      vi.mocked(prisma.userCommunicationInboxWorkspacePref.findUnique).mockResolvedValue(null);
      expect(
        (await saveCommunicationInboxWorkspacePreference("t", "u", { layout: "INVALID" })).ok,
      ).toBe(false);
      expect(
        (await saveCommunicationInboxWorkspacePreference("t", "u", { density: "HUGE" })).ok,
      ).toBe(false);
      expect(
        (await saveCommunicationInboxWorkspacePreference("t", "u", { listSplitPercent: 5 })).ok,
      ).toBe(false);
      expect(
        (await saveCommunicationInboxWorkspacePreference("t", "u", { listSplitPercent: 95 })).ok,
      ).toBe(false);
      expect(prisma.userCommunicationInboxWorkspacePref.upsert).not.toHaveBeenCalled();
    });

    it("persists validated preference for tenant-scoped user", async () => {
      vi.mocked(prisma.userCommunicationInboxWorkspacePref.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.userCommunicationInboxWorkspacePref.upsert).mockResolvedValue({
        layout: "LIST_LARGE",
        density: "SPACIOUS",
        listSplitPercent: 50,
      });
      const result = await saveCommunicationInboxWorkspacePreference("tenant-a", "user-a", {
        layout: "LIST_LARGE",
        density: "SPACIOUS",
      });
      expect(result.ok).toBe(true);
      expect(prisma.userCommunicationInboxWorkspacePref.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId_userId: { tenantId: "tenant-a", userId: "user-a" } },
        }),
      );
    });

    it("reset restores defaults", async () => {
      vi.mocked(prisma.userCommunicationInboxWorkspacePref.deleteMany).mockResolvedValue({
        count: 1,
      });
      const pref = await resetCommunicationInboxWorkspacePreference("tenant-a", "user-a");
      expect(pref).toEqual(defaultInboxWorkspacePreference());
    });
  });

  describe("layouts and split presets", () => {
    it("covers six layouts and preset list ratios", () => {
      expect(INBOX_WORKSPACE_LAYOUTS).toHaveLength(6);
      expect(defaultListSplitPercentForLayout("STANDARD")).toBe(38);
      expect(defaultListSplitPercentForLayout("READING_LARGE")).toBe(28);
      expect(defaultListSplitPercentForLayout("LIST_LARGE")).toBe(50);
      expect(defaultListSplitPercentForLayout("BOTTOM")).toBe(42);
      expect(inboxLayoutUsesVerticalSplit("STANDARD")).toBe(true);
      expect(inboxLayoutUsesHorizontalSplit("BOTTOM")).toBe(true);
      expect(inboxLayoutIsMasterDetailOnDesktop("FULL_READING")).toBe(true);
      expect(inboxLayoutIsMasterDetailOnDesktop("LIST_ONLY")).toBe(true);
    });

    it("clamps split bounds conceptually", () => {
      expect(clampListSplitPercent(10)).toBe(20);
      expect(clampListSplitPercent(90)).toBe(80);
      expect(canRenderSideBySideSplit(900, 38)).toBe(true);
      expect(canRenderSideBySideSplit(600, 50)).toBe(false);
    });
  });

  describe("Ansicht control", () => {
    it("exposes layout and density options with current selection", () => {
      const onLayout = vi.fn();
      render(
        <CommunicationInboxViewControl
          layout="READING_LARGE"
          density="COMPACT"
          onLayoutChange={onLayout}
          onDensityChange={() => undefined}
          onResetDefaults={() => undefined}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Ansicht und Dichte" }));
      expect(screen.getByRole("menuitemradio", { name: "Lesebereich gross" })).toHaveAttribute(
        "aria-checked",
        "true",
      );
      expect(screen.getByRole("menuitemradio", { name: "Kompakt" })).toHaveAttribute(
        "aria-checked",
        "true",
      );
      fireEvent.click(screen.getByRole("menuitemradio", { name: "Liste gross" }));
      expect(onLayout).toHaveBeenCalledWith("LIST_LARGE", { resetSplit: false });
    });

    it("resets split when selecting the same preset again", () => {
      const onLayout = vi.fn();
      render(
        <CommunicationInboxViewControl
          layout="STANDARD"
          density="STANDARD"
          onLayoutChange={onLayout}
          onDensityChange={() => undefined}
          onResetDefaults={() => undefined}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Ansicht und Dichte" }));
      const layoutStandardOptions = screen.getAllByRole("menuitemradio", { name: "Standard" });
      fireEvent.click(layoutStandardOptions[0]!);
      expect(onLayout).toHaveBeenCalledWith("STANDARD", { resetSplit: true });
    });
  });

  describe("accessible resizer", () => {
    it("uses separator semantics and keyboard horizontal resize", () => {
      const onDelta = vi.fn();
      const onEnd = vi.fn();
      render(
        <CommunicationInboxPaneResizeHandle
          orientation="vertical"
          label="Liste"
          valueNow={38}
          valueMin={28}
          valueMax={62}
          onResizeDelta={onDelta}
          onResizeEnd={onEnd}
        />,
      );
      const handle = screen.getByTestId("communication-inbox-vertical-resize");
      expect(handle).toHaveAttribute("role", "separator");
      expect(handle).toHaveAttribute("aria-orientation", "vertical");
      expect(handle).toHaveAttribute("aria-valuemin", "28");
      expect(handle).toHaveAttribute("aria-valuemax", "62");
      expect(handle).toHaveAttribute("aria-valuenow", "38");
      fireEvent.keyDown(handle, { key: "ArrowRight" });
      expect(onDelta).toHaveBeenCalled();
      expect(onEnd).toHaveBeenCalled();
    });

    it("supports vertical keyboard on horizontal separator", () => {
      const onDelta = vi.fn();
      render(
        <CommunicationInboxPaneResizeHandle
          orientation="horizontal"
          label="Liste"
          valueNow={42}
          valueMin={30}
          valueMax={70}
          onResizeDelta={onDelta}
          onResizeEnd={() => undefined}
        />,
      );
      const handle = screen.getByTestId("communication-inbox-horizontal-resize");
      fireEvent.keyDown(handle, { key: "ArrowDown" });
      expect(onDelta).toHaveBeenCalled();
    });
  });

  describe("density and workspace wiring", () => {
    it("documents density enum values", () => {
      expect(INBOX_WORKSPACE_DENSITIES).toEqual(["COMPACT", "STANDARD", "SPACIOUS"]);
    });

    it("workspace integrates view control and layout shell", () => {
      const workspace = readFileSync(
        join(process.cwd(), "components/admin/communication/inbox/CommunicationInboxWorkspace.tsx"),
        "utf8",
      );
      expect(workspace).toContain("CommunicationInboxWorkspaceLayout");
      expect(workspace).toContain("useCommunicationInboxWorkspacePreferences");
      expect(workspace).not.toContain("lg:grid-cols-[minmax(280px,360px)");
    });
  });

  describe("background contract", () => {
    it("keeps approved BG-01R2 URL and SHA256", () => {
      expect(SCE_AUTHENTICATED_APP_BACKGROUND_URL).toBe(
        "/images/background/SCE_background.png?v=2",
      );
      const bytes = readFileSync(
        join(process.cwd(), "public/images/background/SCE_background.png"),
      );
      const crypto = require("node:crypto") as typeof import("node:crypto");
      const hash = crypto.createHash("sha256").update(bytes).digest("hex");
      expect(hash).toBe(SCE_APPROVED_AUTHENTICATED_APP_BACKGROUND_SHA256);
    });
  });

  describe("performance guardrails", () => {
    it("persists split only on resize end handler wiring", () => {
      const hook = readFileSync(
        join(
          process.cwd(),
          "components/admin/communication/inbox/useCommunicationInboxWorkspacePreferences.ts",
        ),
        "utf8",
      );
      expect(hook).toContain("options?.persist");
      expect(hook).toContain("persistListSplitPercent");
      const layout = readFileSync(
        join(
          process.cwd(),
          "components/admin/communication/inbox/CommunicationInboxWorkspaceLayout.tsx",
        ),
        "utf8",
      );
      expect(layout).toContain("onResizeEnd={onSplitPersist}");
    });
  });
});
