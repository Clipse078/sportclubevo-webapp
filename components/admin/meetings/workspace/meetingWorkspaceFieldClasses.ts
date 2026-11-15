import {
  SCE_CD_SECTION_BODY_CLASS,
  SCE_CD_SECTION_HEADER_CLASS,
  SCE_CD_SECTION_SHELL_CLASS,
} from "@/components/admin/club-development/sce-club-development-surface-styles";

export const workspaceInputClass =
  "w-full rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[#0b4aa2]/30";

export const workspacePanelClass = SCE_CD_SECTION_SHELL_CLASS;

export const workspaceSectionHeaderClass = SCE_CD_SECTION_HEADER_CLASS;

export const workspaceSectionBodyClass = SCE_CD_SECTION_BODY_CLASS;

export const workspacePrimaryButtonClass =
  "inline-flex items-center justify-center rounded-lg bg-[#0b4aa2] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#08357a] disabled:opacity-50";

export const workspaceGhostButtonClass =
  "inline-flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--text-2)] transition hover:bg-[var(--surface-2)]";
