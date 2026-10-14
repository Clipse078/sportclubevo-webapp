import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_FLOATING_LAYER_COMPOSER_CLASS,
  SCE_Z_INDEX_COMPOSER_POPOVER,
  SCE_Z_INDEX_MODAL_OVERLAY,
  SCE_Z_INDEX_MODAL_OVERLAY_ELEVATED,
} from "../sce-overlay-layering";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("SCE overlay layering", () => {
  it("defines composer popover above modal overlay and below elevated dialogs", () => {
    expect(SCE_Z_INDEX_MODAL_OVERLAY).toBe(100);
    expect(SCE_Z_INDEX_COMPOSER_POPOVER).toBeGreaterThan(SCE_Z_INDEX_MODAL_OVERLAY);
    expect(SCE_Z_INDEX_MODAL_OVERLAY_ELEVATED).toBeGreaterThan(SCE_Z_INDEX_COMPOSER_POPOVER);
  });

  it("calendar popover uses composer floating layer via PopoverContent", () => {
    const calendar = read("components/sce/activity-datetime/SceActivityCalendarPopover.tsx");
    expect(calendar).toContain('floatingLayer="composer"');
    const popover = read("components/ui/Popover.tsx");
    expect(popover).toContain("data-floating-layer");
    expect(popover).toContain("resolveSceFloatingLayerClass");
  });

  it("exports CSS class token for composer popovers", () => {
    const css = read("app/globals.css");
    expect(css).toContain(`.${SCE_FLOATING_LAYER_COMPOSER_CLASS}`);
  });
});
