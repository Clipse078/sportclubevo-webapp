#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const MAP = {
  Users: "PeopleSceIcon",
  UsersRound: "MemberSceIcon",
  Shield: "RolesAccessSceIcon",
  ShieldCheck: "RolesAccessSceIcon",
  Building2: "OrgUnitSceIcon",
  Globe: "WebsiteSceIcon",
  Globe2: "WebsiteSceIcon",
  Mail: "CommunicationSceIcon",
  CalendarRange: "SeasonSceIcon",
  MapPin: "FacilitySceIcon",
  Newspaper: "NewsSceIcon",
  Monitor: "WebsiteSceIcon",
  ClipboardList: "RequirementsSceIcon",
  ListChecks: "TasksSceIcon",
  CheckSquare: "TasksSceIcon",
  Bell: "NotificationsSceIcon",
  FolderOpen: "DocumentsSceIcon",
};

const IMPORT =
  'import { PeopleSceIcon, MemberSceIcon, RolesAccessSceIcon, OrgUnitSceIcon, WebsiteSceIcon, CommunicationSceIcon, SeasonSceIcon, FacilitySceIcon, NewsSceIcon, TasksSceIcon, NotificationsSceIcon, RequirementsSceIcon, DocumentsSceIcon } from "@/components/icons/domain-sce-icon-components";\n';

const SKIP = new Set(["node_modules", ".next", ".git", "glyphs", "__tests__", "domain-sce-icon-components.tsx"]);

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
  const rel = relative(ROOT, path);
  if (rel.startsWith("components/design-system/icons/")) return false;
  let src = readFileSync(path, "utf8");
  let changed = false;
  for (const [lucide, comp] of Object.entries(MAP)) {
    const re = new RegExp(`icon:\\s*${lucide}\\b`, "g");
    if (re.test(src)) {
      src = src.replace(re, `icon: ${comp}`);
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

const files = [...walk(join(ROOT, "app")), ...walk(join(ROOT, "components")), ...walk(join(ROOT, "lib"))];
let n = 0;
for (const f of files) if (processFile(f)) n++;
console.log(`icon: prop updates in ${n} files`);
