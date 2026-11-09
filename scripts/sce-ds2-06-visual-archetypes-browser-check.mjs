/**
 * SCE-DS2-06R2 — representative page archetype geometry + contrast smoke (Playwright).
 * Run: node scripts/sce-ds2-06-visual-archetypes-browser-check.mjs
 */
import { execSync } from "node:child_process";
import { chromium } from "playwright";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const globalsCss = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
const artifactDir = "/opt/cursor/artifacts";
mkdirSync(artifactDir, { recursive: true });

const html = `<!DOCTYPE html>
<html lang="de" data-sce-theme="white">
<head>
<meta charset="utf-8" />
<style>
${globalsCss}
html, body { margin: 0; background: #ffffff; padding: 24px; font-family: Inter, sans-serif; color: var(--foreground, #0f172a); }
.panel { max-width: 960px; margin: 0 auto; }
.archetype-tabs { display: flex; border-bottom: 1px solid var(--sce-color-border-standard); margin-top: 16px; }
.archetype-tablist { display: flex; gap: 4px; min-height: 2.75rem; align-items: flex-end; width: 100%; }
.archetype-tab { display: inline-block; padding: 10px 12px; border-bottom: 2px solid transparent; color: var(--sce-color-text-secondary); text-decoration: none; font-size: 0.875rem; background: #ffffff; }
.archetype-tab--active { border-bottom-color: #0b4aa2; color: #0b4aa2; }
.archetype-chips { display: flex; gap: 8px; margin-top: 24px; flex-wrap: wrap; }
.archetype-chip { display: inline-flex; align-items: center; border-radius: 6px; border: 1px solid var(--border); padding: 2px 8px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
.archetype-chip--neutral { background: var(--surface-2); color: var(--text-2); }
.archetype-chip--success { border: 1px solid #a7d4b8; background: #e8f2ec; color: #166534; }
</style>
</head>
<body>
<div class="panel" id="root">
  <h1 class="sce-type-page-title" id="page-title">Finanzen</h1>
  <nav class="archetype-tabs" aria-label="Archetype tabs">
    <div role="tablist" class="sce-activity-nav-tablist archetype-tablist">
      <a role="tab" class="sce-ds2-secondary-nav-label archetype-tab archetype-tab--active" id="tab-active">Übersicht</a>
      <a role="tab" class="sce-ds2-secondary-nav-label archetype-tab" id="tab-inactive">Budget</a>
    </div>
  </nav>
  <div class="archetype-chips" id="chips">
    <span class="archetype-chip archetype-chip--success" id="chip-active">Aktiv</span>
    <span class="archetype-chip archetype-chip--neutral" id="chip-inactive">Web</span>
  </div>
</div>
</body>
</html>`;

function contrastRatio(fg, bg) {
  const parse = (hex) => {
    const n = hex.replace("#", "");
    const ch = (i) => {
      const v = Number.parseInt(n.slice(i, i + 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    const r = ch(0);
    const g = ch(2);
    const b = ch(4);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const l1 = parse(fg);
  const l2 = parse(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

async function launchBrowser() {
  try {
    return await chromium.launch();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("Executable doesn't exist")) {
      throw error;
    }
    const attempts =
      process.platform === "linux"
        ? [
            "npx playwright install --with-deps chromium",
            "npx playwright install chromium",
          ]
        : ["npx playwright install chromium"];
    let lastError;
    for (const cmd of attempts) {
      try {
        execSync(cmd, { stdio: "inherit" });
        return chromium.launch();
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  }
}

const browser = await launchBrowser();
const page = await browser.newPage();

const viewports = [
  { width: 1280, height: 800, suffix: "desktop" },
  { width: 390, height: 844, suffix: "narrow" },
];

for (const vp of viewports) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.setContent(html, { waitUntil: "domcontentloaded" });
  await page.screenshot({
    path: join(artifactDir, `ds2-06-archetype-tabs-chips-${vp.suffix}.png`),
    fullPage: true,
  });
}

const metrics = await page.evaluate(() => {
  function rgbToHex(rgb) {
    const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return null;
    const h = (n) => Number(n).toString(16).padStart(2, "0");
    return `#${h(m[1])}${h(m[2])}${h(m[3])}`;
  }
  const canvasBg = "#ffffff";

  const read = (id) => {
    const el = document.getElementById(id);
    const cs = getComputedStyle(el);
    const bgRaw = cs.backgroundColor;
    const background =
      rgbToHex(bgRaw) ??
      (bgRaw === "rgba(0, 0, 0, 0)" || bgRaw === "transparent" ? canvasBg : null);
    return {
      color: rgbToHex(cs.color),
      background,
    };
  };
  return {
    tabActive: read("tab-active"),
    tabInactive: read("tab-inactive"),
    chipActive: read("chip-active"),
    chipInactive: read("chip-inactive"),
    titleTransform: getComputedStyle(document.getElementById("page-title")).textTransform,
  };
});

await browser.close();

const failures = [];
if (metrics.titleTransform !== "uppercase") {
  failures.push(`page title not uppercase (${metrics.titleTransform})`);
}
for (const [id, pair] of Object.entries({
  tabActive: metrics.tabActive,
  tabInactive: metrics.tabInactive,
  chipActive: metrics.chipActive,
  chipInactive: metrics.chipInactive,
})) {
  if (!pair?.color || !pair?.background) {
    failures.push(`${id}: missing computed colors`);
    continue;
  }
  const ratio = contrastRatio(pair.color, pair.background);
  if (ratio < 4.5) {
    failures.push(`${id}: contrast ${ratio.toFixed(2)} < 4.5 (${pair.color} on ${pair.background})`);
  }
}

writeFileSync(
  join(artifactDir, "ds2-06-visual-archetypes-metrics.json"),
  JSON.stringify({ metrics, failures }, null, 2),
);

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("SCE-DS2-06 visual archetype check passed.");
