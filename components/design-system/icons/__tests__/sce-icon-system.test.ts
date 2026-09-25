import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_ICON_CATEGORIES,
  SCE_ICON_SEMANTIC_TYPES,
  SCE_ICON_STATUSES,
} from "../SceIcon.types";
import {
  SCE_ICON_REGISTRY,
  SCE_ICON_REGISTRY_NAMES,
} from "../registry";
import { resolveSceIconName } from "../resolve-icon-name";
import { runLegacyIconInventory } from "@/lib/icons/legacy-icon-inventory";

const REQUIRED_ICONS = [
  "dashboard",
  "calendar",
  "week-planner",
  "training",
  "match",
  "tournament",
  "event",
  "members",
  "team",
  "organisation",
  "role",
  "finance",
  "message",
  "notification",
  "document",
  "website",
  "infoboard",
  "sponsoring",
  "search",
  "settings",
  "profile",
  "add",
  "edit",
  "close",
  "more",
] as const;

const GLYPH_ROOT = join(process.cwd(), "components/design-system/icons/glyphs");

function listGlyphSourceFiles(): string[] {
  const out: string[] = [];
  function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.tsx$/.test(entry)) out.push(full);
    }
  }
  walk(GLYPH_ROOT);
  return out;
}

describe("SCE-ICONS-01 registry", () => {
  it("has unique canonical names", () => {
    const names = SCE_ICON_REGISTRY_NAMES;
    expect(new Set(names).size).toBe(names.length);
  });

  it("resolves every registered glyph component", () => {
    for (const name of SCE_ICON_REGISTRY_NAMES) {
      expect(SCE_ICON_REGISTRY[name].Glyph).toBeTypeOf("function");
    }
  });

  it("uses valid categories, semantic types, and stable metadata", () => {
    for (const name of SCE_ICON_REGISTRY_NAMES) {
      const entry = SCE_ICON_REGISTRY[name];
      expect(SCE_ICON_CATEGORIES).toContain(entry.category);
      expect(SCE_ICON_SEMANTIC_TYPES).toContain(entry.semanticType);
      expect(SCE_ICON_STATUSES).toContain(entry.status);
      expect(entry.label.length).toBeGreaterThan(0);
      expect(entry.purpose.length).toBeGreaterThan(0);
      expect(entry.name).toBe(name);
    }
  });

  it("keeps aliases unambiguous", () => {
    const seen = new Map<string, string>();
    for (const name of SCE_ICON_REGISTRY_NAMES) {
      for (const alias of [name, ...SCE_ICON_REGISTRY[name].aliases]) {
        const key = alias.toLowerCase();
        const existing = seen.get(key);
        if (existing) {
          expect(existing).toBe(name);
        } else {
          seen.set(key, name);
        }
        expect(resolveSceIconName(alias)).toBe(name);
      }
    }
  });

  it("includes all 25 required production icons", () => {
    for (const name of REQUIRED_ICONS) {
      expect(SCE_ICON_REGISTRY_NAMES).toContain(name);
    }
    expect(SCE_ICON_REGISTRY_NAMES.length).toBe(25);
  });
});

describe("SCE-ICONS-01 theming tokens", () => {
  it("defines semantic icon roles for Original and Light", () => {
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    for (const token of [
      "--sce-icon-primary",
      "--sce-icon-secondary",
      "--sce-icon-accent",
      "--sce-icon-muted",
    ]) {
      expect(css).toContain(`${token}:`);
    }
    expect(css).toContain(".sce-theme-light");
    expect(css).toContain('[data-sce-theme="light"]');
  });

  it("glyph sources use semantic tokens not hard-coded theme foregrounds", () => {
    const forbidden = [
      /stroke=["']#fff/i,
      /stroke=["']#ffffff/i,
      /stroke=["']white/i,
      /fill=["']#fff/i,
      /fill=["']#ffffff/i,
    ];
    for (const file of listGlyphSourceFiles()) {
      const src = readFileSync(file, "utf8");
      expect(src).toContain("SceIconSvg");
      for (const pattern of forbidden) {
        expect(src, relative(process.cwd(), file)).not.toMatch(pattern);
      }
      expect(src, relative(process.cwd(), file)).toMatch(
        /var\(--sce-icon-|currentColor|stroke="currentColor"|role="(primary|secondary|accent|muted)"/,
      );
    }
  });

  it("approved master React sources use semantic tokens", () => {
    const masterGlyph = readFileSync(
      join(process.cwd(), "components/design-system/icons/masters/approved-hero-glyphs.tsx"),
      "utf8",
    );
    expect(masterGlyph).toContain("SceIconSvg");
    expect(masterGlyph).toMatch(/var\(--sce-icon-/);
    expect(masterGlyph).not.toMatch(/lucide-react/);
  });
});

describe("SCE-ICONS-01 security & assets", () => {
  it("has no remote svg, raster icons, or dangerous html in icon system", () => {
    const root = join(process.cwd(), "components/design-system/icons");
    const files: string[] = [];
    function walk(dir: string) {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full);
        else files.push(full);
      }
    }
    walk(root);
    for (const file of files) {
      if (!/\.tsx$/.test(file)) continue;
      if (file.includes("/__tests__/")) continue;
      if (file.endsWith(".md")) continue;
      const src = readFileSync(file, "utf8");
      expect(src).not.toMatch(/dangerouslySetInnerHTML/);
      expect(src).not.toMatch(/https?:\/\/.*\.svg/i);
      expect(src).not.toMatch(/\.png|\.jpg|\.webp/i);
    }
  });
});

describe("SCE-ICONS-01 governance", () => {
  it("runs legacy inventory without mutating sources", () => {
    const report = runLegacyIconInventory();
    expect(report.scannedFiles).toBeGreaterThan(100);
    expect(report.enforcementActive).toBe(false);
    expect(report.bySource["lucide-react"].count).toBeGreaterThan(0);
  });

  it("documents governance and does not enforce migration yet", () => {
    const doc = readFileSync(
      join(process.cwd(), "components/design-system/icons/GOVERNANCE.md"),
      "utf8",
    );
    expect(doc).toContain("SCE-ICONS-04");
    expect(doc).toContain("does **not** enforce");
    expect(doc).toMatch(/Approved SCE master artwork is authoritative/);
  });
});

describe("SCE-ICONS-01 specimen", () => {
  it("dev specimen page delegates availability to the specimen gate", () => {
    const page = readFileSync(
      join(process.cwd(), "app/(admin)/dashboard/dev/sce-icons/page.tsx"),
      "utf8",
    );
    expect(page).toContain("notFound");
    expect(page).toContain("isSceIconSpecimenAvailable");
    expect(page).toContain("SceIconSpecimen");
  });

  it("specimen surfaces approved hero masters at the top", () => {
    const specimen = readFileSync(
      join(
        process.cwd(),
        "components/design-system/icons/specimen/SceIconSpecimen.tsx",
      ),
      "utf8",
    );
    expect(specimen).toContain("SCE Hero Icons — Approved Masters");
    expect(specimen).toMatch(/32.*48|48.*32/s);
  });
});
