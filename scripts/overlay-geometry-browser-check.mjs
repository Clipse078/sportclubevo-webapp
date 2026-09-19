/**
 * SCE-RESPONSIVE-01B — headless browser geometry smoke (computed layout).
 * Run: node scripts/overlay-geometry-browser-check.mjs
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const VIEWPORTS = [1280, 1366, 1440, 1536, 1920];
const SIDEBAR_WIDTH = 320;
const GUTTER = 16;

const globalsCss = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8" />
<style>
${globalsCss}
body { margin: 0; background: #0a0f1e; }
.panel {
  position: relative;
  z-index: 10;
  width: 100%;
  min-width: 0;
  max-width: min(100%, var(--sce-dialog-workspace-max-width));
  height: 400px;
  background: #121a2e;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 1rem;
}
</style>
</head>
<body>
<div class="sce-modal-overlay-root" id="overlay">
  <div class="sce-modal-overlay-backdrop"></div>
  <div class="sce-modal-overlay-content-viewport" id="viewport">
    <div class="panel" id="panel">Dialog</div>
  </div>
</div>
</body>
</html>`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch();
const page = await browser.newPage();

let failures = 0;

for (const width of VIEWPORTS) {
  await page.setViewportSize({ width, height: 900 });
  await page.setContent(html, { waitUntil: "domcontentloaded" });

  for (const collapsed of [false, true]) {
    await page.evaluate(
      ({ sidebarWidth, collapsed }) => {
        const root = document.documentElement;
        root.style.setProperty("--sidebar-width", `${sidebarWidth}px`);
        root.style.removeProperty("--sce-sidebar-effective-width");
        if (collapsed) root.dataset.sidebarCollapsed = "1";
        else root.removeAttribute("data-sidebar-collapsed");
      },
      { sidebarWidth: SIDEBAR_WIDTH, collapsed },
    );

    const box = await page.evaluate(() => {
      const viewport = document.getElementById("viewport");
      const panel = document.getElementById("panel");
      const vr = viewport.getBoundingClientRect();
      const pr = panel.getBoundingClientRect();
      const effective = getComputedStyle(document.documentElement)
        .getPropertyValue("--sce-sidebar-effective-width")
        .trim();
      return {
        viewportLeft: vr.left,
        viewportWidth: vr.width,
        panelLeft: pr.left,
        panelRight: pr.right,
        panelWidth: pr.width,
        effective,
      };
    });

    const effectivePx = collapsed ? 56 : SIDEBAR_WIDTH;
    const minLeft = effectivePx + GUTTER;
    const maxRight = width - GUTTER;

    try {
      assert(
        Math.abs(box.viewportLeft - effectivePx) < 1,
        `${width}px collapsed=${collapsed}: viewport left ${box.viewportLeft} != ${effectivePx}`,
      );
      assert(
        box.panelLeft >= minLeft - 1,
        `${width}px collapsed=${collapsed}: panel left ${box.panelLeft} < ${minLeft}`,
      );
      assert(
        box.panelRight <= maxRight + 1,
        `${width}px collapsed=${collapsed}: panel right ${box.panelRight} > ${maxRight}`,
      );
      console.log(`OK ${width}px collapsed=${collapsed} panel [${box.panelLeft.toFixed(1)}, ${box.panelRight.toFixed(1)}]`);
    } catch (e) {
      console.error("FAIL", e.message);
      failures++;
    }
  }
}

await browser.close();
if (failures > 0) {
  console.error(`\n${failures} geometry check(s) failed`);
  process.exit(1);
}
console.log("\nAll browser geometry checks passed.");
