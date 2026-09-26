import { SCE_APPROVED_MASTER_ICON_NAMES } from "@/components/design-system/icons/masters/approved-hero-meta";
import {
  MISSING_BY_LUCIDE,
  UNAMBIGUOUS_DOMAIN_LUCIDE_TO_SCE,
} from "@/lib/icons/product-domain-icon-inventory";
import { LUCIDE_UTILITY_ALLOWLIST } from "@/lib/icons/lucide-utility-allowlist";
import { missingSceSemanticConcepts } from "@/lib/icons/missing-sce-semantics";

export type WebappIconSemanticCategory =
  | "SCE_DOMAIN_APPROVED"
  | "SCE_DOMAIN_MISSING_MASTER"
  | "UTILITY_ACTION"
  | "STATUS_STATE"
  | "CONTENT_IDENTITY"
  | "DECORATIVE"
  | "DEAD_OR_NON_RENDERED"
  | "UNKNOWN_REQUIRES_REVIEW";

export type IconSemanticResolution = {
  category: WebappIconSemanticCategory;
  sceMaster: string | null;
  missingConcept: string | null;
  reason: string;
  legacyDespiteMaster: boolean;
};

type DefaultRule = {
  category: WebappIconSemanticCategory;
  sceMaster?: string | null;
  missingConcept?: string | null;
  reason: string;
};

const APPROVED = new Set(SCE_APPROVED_MASTER_ICON_NAMES as readonly string[]);

/** Default semantic role for Lucide symbols not on the utility allowlist (SCE-ICONS-11). */
export const LUCIDE_DEFAULT_SEMANTIC: Record<string, DefaultRule> = {
  AlignCenter: { category: "UTILITY_ACTION", reason: "Rich-text alignment control" },
  AlignLeft: { category: "UTILITY_ACTION", reason: "Rich-text alignment control" },
  AlignRight: { category: "UTILITY_ACTION", reason: "Rich-text alignment control" },
  Archive: { category: "SCE_DOMAIN_APPROVED", sceMaster: "archive", reason: "Archive module / archival state" },
  ArchiveRestore: { category: "UTILITY_ACTION", reason: "Restore-from-archive action" },
  ArrowDownAZ: { category: "UTILITY_ACTION", reason: "Sort control" },
  ArrowDownRight: { category: "UTILITY_ACTION", reason: "Directional affordance" },
  ArrowDownUp: { category: "UTILITY_ACTION", reason: "Reorder / sort" },
  ArrowRightLeft: { category: "UTILITY_ACTION", reason: "Swap / transfer action" },
  ArrowUpAZ: { category: "UTILITY_ACTION", reason: "Sort control" },
  Award: { category: "SCE_DOMAIN_APPROVED", sceMaster: "results", reason: "Achievement / results metaphor" },
  Baby: { category: "CONTENT_IDENTITY", reason: "Youth / age-group content marker" },
  BarChart2: { category: "SCE_DOMAIN_APPROVED", sceMaster: "analytics", reason: "Analytics chart surface" },
  BarChart3: { category: "SCE_DOMAIN_APPROVED", sceMaster: "analytics", reason: "Analytics chart surface" },
  BellOff: { category: "STATUS_STATE", reason: "Notifications muted state" },
  BellRing: { category: "STATUS_STATE", reason: "Active notification signal" },
  Bold: { category: "UTILITY_ACTION", reason: "Rich-text formatting" },
  Bookmark: { category: "UTILITY_ACTION", reason: "Saved/bookmarked item marker" },
  CalendarPlus: { category: "UTILITY_ACTION", reason: "Create calendar entry action" },
  Camera: { category: "CONTENT_IDENTITY", reason: "Photo / media capture content" },
  CheckCheck: { category: "STATUS_STATE", reason: "Completed / double-checked state" },
  CircleAlert: { category: "STATUS_STATE", reason: "Warning / alert state" },
  CircleDot: { category: "STATUS_STATE", reason: "Active / selected state indicator" },
  CircleHelp: { category: "STATUS_STATE", reason: "Help / info affordance" },
  ClipboardCheck: { category: "SCE_DOMAIN_APPROVED", sceMaster: "approval", reason: "Approval / sign-off workflow" },
  Clock3: { category: "STATUS_STATE", reason: "Time / schedule metadata" },
  Cloud: { category: "UTILITY_ACTION", reason: "Cloud sync / external storage affordance" },
  Code: { category: "UTILITY_ACTION", reason: "Developer / embed code surface" },
  Columns3: { category: "UTILITY_ACTION", reason: "Column layout control" },
  ContactRound: { category: "SCE_DOMAIN_APPROVED", sceMaster: "contact", reason: "Contact person domain" },
  CreditCard: { category: "SCE_DOMAIN_APPROVED", sceMaster: "payment", reason: "Payment instrument domain" },
  Crop: { category: "UTILITY_ACTION", reason: "Image crop tool" },
  Crosshair: { category: "UTILITY_ACTION", reason: "Targeting / precision picker" },
  Database: { category: "SCE_DOMAIN_APPROVED", sceMaster: "integration", reason: "Data source / integration backend" },
  DollarSign: { category: "SCE_DOMAIN_APPROVED", sceMaster: "finance", reason: "Money / finance amount" },
  DoorOpen: { category: "UTILITY_ACTION", reason: "Room / access portal affordance" },
  Dumbbell: { category: "SCE_DOMAIN_APPROVED", sceMaster: "training", reason: "Training / fitness domain" },
  Edit: { category: "UTILITY_ACTION", reason: "Edit action" },
  Edit2: { category: "UTILITY_ACTION", reason: "Edit action" },
  Eraser: { category: "UTILITY_ACTION", reason: "Clear / erase action" },
  File: { category: "UTILITY_ACTION", reason: "Generic file type glyph" },
  FileArchive: { category: "UTILITY_ACTION", reason: "Archived file type" },
  FileAudio: { category: "CONTENT_IDENTITY", reason: "Audio media type" },
  FileEdit: { category: "UTILITY_ACTION", reason: "Editable document action" },
  FileImage: { category: "CONTENT_IDENTITY", reason: "Image media type" },
  FilePenLine: { category: "UTILITY_ACTION", reason: "Draft / edit document" },
  FileSpreadsheet: { category: "SCE_DOMAIN_APPROVED", sceMaster: "export", reason: "Spreadsheet export surface" },
  FileUp: { category: "UTILITY_ACTION", reason: "Upload file action" },
  FileVideo: { category: "CONTENT_IDENTITY", reason: "Video media type" },
  Film: { category: "CONTENT_IDENTITY", reason: "Video / film media content" },
  Flag: { category: "CONTENT_IDENTITY", reason: "Locale / content flag (not domain nav)" },
  FolderClosed: { category: "UTILITY_ACTION", reason: "Folder container UI" },
  FolderInput: { category: "UTILITY_ACTION", reason: "Import-into-folder action" },
  FolderPlus: { category: "UTILITY_ACTION", reason: "Create folder action" },
  GitBranch: { category: "SCE_DOMAIN_APPROVED", sceMaster: "workflow", reason: "Branching workflow metaphor" },
  GlobeLock: { category: "STATUS_STATE", reason: "Restricted / non-public visibility" },
  HandCoins: { category: "SCE_DOMAIN_APPROVED", sceMaster: "sponsor", reason: "Sponsorship / funding domain" },
  Handshake: { category: "SCE_DOMAIN_APPROVED", sceMaster: "partner", reason: "Partnership domain" },
  Hash: { category: "UTILITY_ACTION", reason: "Tag / identifier token" },
  Heading2: { category: "UTILITY_ACTION", reason: "Rich-text block type" },
  Heading3: { category: "UTILITY_ACTION", reason: "Rich-text block type" },
  Heart: { category: "DECORATIVE", reason: "Emphasis / favorite decorative" },
  HeartPulse: { category: "STATUS_STATE", reason: "Health / vitality indicator" },
  History: { category: "SCE_DOMAIN_APPROVED", sceMaster: "history", reason: "History / audit trail module" },
  Home: { category: "SCE_DOMAIN_APPROVED", sceMaster: "dashboard", reason: "Home / dashboard entry" },
  Images: { category: "SCE_DOMAIN_MISSING_MASTER", missingConcept: "media-library", reason: "Media gallery without dedicated master" },
  Inbox: { category: "SCE_DOMAIN_APPROVED", sceMaster: "attention", reason: "Inbox / attention queue" },
  Italic: { category: "UTILITY_ACTION", reason: "Rich-text formatting" },
  Key: { category: "UTILITY_ACTION", reason: "Credential / key affordance" },
  KeyRound: { category: "UTILITY_ACTION", reason: "Access key / API key affordance" },
  Layers: { category: "SCE_DOMAIN_APPROVED", sceMaster: "org-unit", reason: "Layered org structure" },
  Layers3: { category: "SCE_DOMAIN_APPROVED", sceMaster: "org-unit", reason: "Layered org structure" },
  Layout: { category: "UTILITY_ACTION", reason: "Layout picker" },
  LayoutDashboard: { category: "SCE_DOMAIN_APPROVED", sceMaster: "dashboard", reason: "Dashboard layout module" },
  LayoutGrid: { category: "UTILITY_ACTION", reason: "Grid layout / generic module fallback" },
  LayoutList: { category: "UTILITY_ACTION", reason: "List layout toggle" },
  LayoutPanelLeft: { category: "UTILITY_ACTION", reason: "Panel layout control" },
  Library: { category: "SCE_DOMAIN_APPROVED", sceMaster: "documents", reason: "Library / reusable content collection" },
  Link2Off: { category: "UTILITY_ACTION", reason: "Unlink action" },
  List: { category: "UTILITY_ACTION", reason: "List view toggle" },
  ListOrdered: { category: "UTILITY_ACTION", reason: "Ordered list formatting" },
  LockKeyhole: { category: "STATUS_STATE", reason: "Locked / restricted state" },
  LogIn: { category: "UTILITY_ACTION", reason: "Sign-in action" },
  MapPinned: { category: "SCE_DOMAIN_APPROVED", sceMaster: "facility", reason: "Pinned location / facility" },
  Maximize2: { category: "UTILITY_ACTION", reason: "Expand / maximize" },
  Megaphone: { category: "SCE_DOMAIN_APPROVED", sceMaster: "communication", reason: "Broadcast / communication" },
  Merge: { category: "UTILITY_ACTION", reason: "Merge records action" },
  MessageSquare: { category: "SCE_DOMAIN_APPROVED", sceMaster: "communication", reason: "Messaging domain" },
  MousePointer2: { category: "UTILITY_ACTION", reason: "Pointer / click affordance" },
  MousePointerClick: { category: "UTILITY_ACTION", reason: "Click interaction hint" },
  Move: { category: "UTILITY_ACTION", reason: "Drag / move control" },
  MoveHorizontal: { category: "UTILITY_ACTION", reason: "Horizontal reorder" },
  Palette: { category: "UTILITY_ACTION", reason: "Theme / color picker" },
  PanelRightClose: { category: "UTILITY_ACTION", reason: "Close side panel" },
  PanelRightOpen: { category: "UTILITY_ACTION", reason: "Open side panel" },
  Paperclip: { category: "UTILITY_ACTION", reason: "Attachment affordance" },
  Phone: { category: "CONTENT_IDENTITY", reason: "Phone contact detail" },
  PlayCircle: { category: "UTILITY_ACTION", reason: "Play media control" },
  PlusCircle: { category: "UTILITY_ACTION", reason: "Create action variant" },
  Power: { category: "STATUS_STATE", reason: "Active / powered on" },
  PowerOff: { category: "STATUS_STATE", reason: "Inactive / powered off" },
  Presentation: { category: "UTILITY_ACTION", reason: "Presentation mode / slide deck UI" },
  Quote: { category: "UTILITY_ACTION", reason: "Blockquote formatting" },
  Radio: { category: "UTILITY_ACTION", reason: "Single-select control" },
  Repeat: { category: "UTILITY_ACTION", reason: "Repeat / recurrence control" },
  Repeat2: { category: "UTILITY_ACTION", reason: "Repeat / recurrence control" },
  Replace: { category: "UTILITY_ACTION", reason: "Replace content action" },
  ScrollText: { category: "SCE_DOMAIN_APPROVED", sceMaster: "report", reason: "Report / long-form document" },
  ShieldHalf: { category: "STATUS_STATE", reason: "Partial protection state" },
  Shirt: { category: "SCE_DOMAIN_APPROVED", sceMaster: "team", reason: "Team kit / squad metaphor" },
  Smile: { category: "DECORATIVE", reason: "Decorative emoji-style glyph" },
  Sparkles: { category: "DECORATIVE", reason: "Highlight / AI decorative accent" },
  Square: { category: "UTILITY_ACTION", reason: "Shape / checkbox primitive" },
  SquareCheck: { category: "STATUS_STATE", reason: "Checked state" },
  Star: { category: "DECORATIVE", reason: "Favorite / highlight decorative" },
  Strikethrough: { category: "UTILITY_ACTION", reason: "Rich-text formatting" },
  Swords: { category: "SCE_DOMAIN_APPROVED", sceMaster: "match", reason: "Competitive match metaphor" },
  Tag: { category: "UTILITY_ACTION", reason: "Label / tag metadata" },
  ToggleLeft: { category: "UTILITY_ACTION", reason: "Toggle control" },
  ToggleRight: { category: "UTILITY_ACTION", reason: "Toggle control" },
  TrendingDown: { category: "STATUS_STATE", reason: "Negative trend indicator" },
  TrendingUp: { category: "STATUS_STATE", reason: "Positive trend indicator" },
  Type: { category: "UTILITY_ACTION", reason: "Typography / text block" },
  Unlink: { category: "UTILITY_ACTION", reason: "Unlink action" },
  UploadCloud: { category: "UTILITY_ACTION", reason: "Cloud upload action" },
  User: { category: "CONTENT_IDENTITY", reason: "Individual person reference in content" },
  UserCheck: { category: "STATUS_STATE", reason: "Verified / linked user state" },
  UserCircle2: { category: "CONTENT_IDENTITY", reason: "Person avatar placeholder" },
  UserCog: { category: "UTILITY_ACTION", reason: "User settings action" },
  UserMinus: { category: "UTILITY_ACTION", reason: "Remove user action" },
  UserPlus: { category: "UTILITY_ACTION", reason: "Add user action" },
  UserRound: { category: "CONTENT_IDENTITY", reason: "Person reference" },
  UserX: { category: "UTILITY_ACTION", reason: "Remove / block user action" },
  Volleyball: { category: "DECORATIVE", reason: "Sport decorative illustration" },
  Wifi: { category: "STATUS_STATE", reason: "Connectivity state" },
  Wrench: { category: "UTILITY_ACTION", reason: "Maintenance / settings tool" },
  Zap: { category: "DECORATIVE", reason: "Quick action accent" },
};

const CONTEXT_OVERRIDES: Array<{
  symbol: string;
  filePattern?: RegExp;
  snippetPattern?: RegExp;
  rule: DefaultRule;
}> = [
  {
    symbol: "Archive",
    snippetPattern: /archivieren|ArchiveFolder|RestoreFolder|TrashFolder|workspace/i,
    rule: { category: "UTILITY_ACTION", reason: "Archive/trash workspace action control" },
  },
  {
    symbol: "History",
    snippetPattern: /Versionshistorie|version history|Erstellt:|Keine Änderungen/i,
    rule: { category: "UTILITY_ACTION", reason: "Inline version/timeline UI (not history module)" },
  },
  {
    symbol: "Trophy",
    snippetPattern: /veranstaltungen-kpi-total|Total|Wettkampf|competition/i,
    rule: {
      category: "SCE_DOMAIN_MISSING_MASTER",
      missingConcept: "competition",
      reason: "Competition/count KPI — no competition master",
    },
  },
  {
    symbol: "Trophy",
    filePattern: /nav-config\.ts$/,
    rule: {
      category: "SCE_DOMAIN_MISSING_MASTER",
      missingConcept: "competition",
      reason: "Wettkämpfe navigation",
    },
  },
  {
    symbol: "Users",
    filePattern: /nav-config\.ts$/,
    snippetPattern: /target-groups|Zielgruppen/i,
    rule: {
      category: "SCE_DOMAIN_MISSING_MASTER",
      missingConcept: "target-group",
      reason: "Target groups navigation",
    },
  },
  {
    symbol: "User",
    snippetPattern: /Organisator|organizer|linkedUser|Benutzerkonto/i,
    rule: { category: "CONTENT_IDENTITY", reason: "Specific person metadata in record" },
  },
  {
    symbol: "LayoutGrid",
    snippetPattern: /data-nav-destination-fallback|fallbackGenericModuleGlyph/i,
    rule: { category: "UTILITY_ACTION", reason: "Generic module fallback when SCE nav mapping missing" },
  },
  {
    symbol: "Hourglass",
    filePattern: /nav-config|warteliste/i,
    rule: {
      category: "SCE_DOMAIN_MISSING_MASTER",
      missingConcept: "waiting-list",
      reason: "Waiting list queue semantics",
    },
  },
  {
    symbol: "ShieldAlert",
    filePattern: /nav-config|vorfaelle|disziplin/i,
    rule: {
      category: "SCE_DOMAIN_MISSING_MASTER",
      missingConcept: "discipline-incident",
      reason: "Discipline incidents module",
    },
  },
  {
    symbol: "Menu",
    filePattern: /website\/page|nav-config|cms/i,
    snippetPattern: /Navigation|website-navigation|Schnellzugriff/i,
    rule: {
      category: "SCE_DOMAIN_MISSING_MASTER",
      missingConcept: "website-navigation-structure",
      reason: "Website navigation tree configuration",
    },
  },
  {
    symbol: "Menu",
    snippetPattern: /GlobalNavDrawer|mobile|hamburger/i,
    rule: { category: "UTILITY_ACTION", reason: "Mobile menu drawer control" },
  },
];

export function resolveLucideSemantic(
  symbol: string,
  file: string,
  jsxSnippet: string,
): IconSemanticResolution {
  const renderedInJsx =
    jsxSnippet.includes(`<${symbol}`) ||
    new RegExp(`\\bicon:\\s*${symbol}\\b`).test(jsxSnippet) ||
    new RegExp(`icon=\\{${symbol}\\}`).test(jsxSnippet);

  if (!renderedInJsx && jsxSnippet.length < 4000) {
    return {
      category: "DEAD_OR_NON_RENDERED",
      sceMaster: null,
      missingConcept: null,
      reason: "Import present without rendered JSX tag",
      legacyDespiteMaster: false,
    };
  }

  if (LUCIDE_UTILITY_ALLOWLIST.has(symbol)) {
    for (const override of CONTEXT_OVERRIDES) {
      if (override.symbol !== symbol) continue;
      if (override.filePattern && !override.filePattern.test(file)) continue;
      if (override.snippetPattern && !override.snippetPattern.test(jsxSnippet)) continue;
      return finalize(symbol, override.rule, jsxSnippet);
    }
    return {
      category: "UTILITY_ACTION",
      sceMaster: null,
      missingConcept: null,
      reason: "Lucide utility allowlist",
      legacyDespiteMaster: false,
    };
  }

  for (const override of CONTEXT_OVERRIDES) {
    if (override.symbol !== symbol) continue;
    if (override.filePattern && !override.filePattern.test(file)) continue;
    if (override.snippetPattern && !override.snippetPattern.test(jsxSnippet)) continue;
    return finalize(symbol, override.rule, jsxSnippet);
  }

  const missingFromTable = MISSING_BY_LUCIDE[symbol];
  if (missingFromTable && missingSceSemanticConcepts().has(missingFromTable)) {
    return finalize(
      symbol,
      {
        category: "SCE_DOMAIN_MISSING_MASTER",
        missingConcept: missingFromTable,
        reason: "Known missing SCE semantic (inventory table)",
      },
      jsxSnippet,
    );
  }

  const mappedMaster = UNAMBIGUOUS_DOMAIN_LUCIDE_TO_SCE[symbol];
  if (mappedMaster && APPROVED.has(mappedMaster)) {
    return finalize(
      symbol,
      {
        category: "SCE_DOMAIN_APPROVED",
        sceMaster: mappedMaster,
        reason: "Approved SCE master mapping exists",
      },
      jsxSnippet,
      true,
    );
  }

  const defaults = LUCIDE_DEFAULT_SEMANTIC[symbol];
  if (defaults) {
    return finalize(symbol, defaults, jsxSnippet);
  }

  return {
    category: "UNKNOWN_REQUIRES_REVIEW",
    sceMaster: null,
    missingConcept: null,
    reason: "No SCE-ICONS-11 semantic rule",
    legacyDespiteMaster: false,
  };
}

function finalize(
  symbol: string,
  rule: DefaultRule,
  jsxSnippet: string,
  forceLegacy = false,
): IconSemanticResolution {
  const sceMaster = rule.sceMaster ?? null;
  const mappedMaster = UNAMBIGUOUS_DOMAIN_LUCIDE_TO_SCE[symbol] ?? null;
  const usesApprovedMasterInJsx =
    Boolean(sceMaster && APPROVED.has(sceMaster)) ||
    Boolean(mappedMaster && APPROVED.has(mappedMaster));

  const legacyDespiteMaster =
    forceLegacy ||
    (usesApprovedMasterInJsx &&
      !jsxSnippet.includes("SceIcon") &&
      !jsxSnippet.includes("SceIconSvg") &&
      !jsxSnippet.includes("ProductDomainSceIcon"));

  return {
    category: rule.category,
    sceMaster: sceMaster ?? mappedMaster,
    missingConcept: rule.missingConcept ?? null,
    reason: rule.reason,
    legacyDespiteMaster,
  };
}

/** Lucide symbols on the utility allowlist that represent domain gaps when used in nav/CMS. */
export const QUESTIONABLE_UTILITY_ALLOWLIST = [
  "Hourglass",
  "Menu",
  "ShieldAlert",
] as const;
