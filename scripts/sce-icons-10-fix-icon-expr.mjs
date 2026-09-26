#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const MAP = {
  Shield: "RolesAccessSceIcon",
  ShieldCheck: "RolesAccessSceIcon",
  Users: "PeopleSceIcon",
  Building2: "OrgUnitSceIcon",
  CalendarRange: "SeasonSceIcon",
  Globe: "WebsiteSceIcon",
  MapPin: "FacilitySceIcon",
  FolderOpen: "DocumentsSceIcon",
  Monitor: "InfoboardSceIcon",
  Newspaper: "NewsSceIcon",
  Bell: "NotificationsSceIcon",
  CheckSquare: "TasksSceIcon",
};

const IMPORT =
  'import { PeopleSceIcon, RolesAccessSceIcon, OrgUnitSceIcon, SeasonSceIcon, WebsiteSceIcon, FacilitySceIcon, DocumentsSceIcon, NewsSceIcon, NotificationsSceIcon, TasksSceIcon, InfoboardSceIcon } from "@/components/icons/domain-sce-icon-components";\n';

const SKIP = new Set(["node_modules", ".next", ".git", "glyphs", "__tests__"]);

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (SKIP.has(e)) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx$/.test(e)) out.push(p);
  }
  return out;
}

function processFile(path) {
  let src = readFileSync(path, "utf8");
  let changed = false;
  for (const [lucide, comp] of Object.entries(MAP)) {
    const re = new RegExp(`icon=\\{${lucide}\\}`, "g");
    if (re.test(src)) {
      src = src.replace(re, `icon={${comp}}`);
      changed = true;
    }
  }
  if (changed && !src.includes("domain-sce-icon-components")) {
    const nl = src.indexOf("\n");
    src = src.slice(0, nl + 1) + IMPORT + src.slice(nl + 1);
  }
  if (changed) writeFileSync(path, src);
  return changed;
}

const targets = [...walk(join(ROOT, "app")), ...walk(join(ROOT, "components"))];
let n = 0;
for (const f of targets) if (processFile(f)) n++;
console.log(`icon={Component} updates: ${n}`);
