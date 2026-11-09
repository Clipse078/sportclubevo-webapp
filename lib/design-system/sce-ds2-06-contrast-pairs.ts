/**
 * SCE-DS2-06 — contrast guardrails for unified page + contextual panel surfaces.
 */
import type { SceWhiteEditionContrastPair } from "./sce-white-edition-contrast";

export const SCE_DS2_06_CONTRAST_PAIRS: SceWhiteEditionContrastPair[] = [
  {
    id: "workspace-header-on-canvas",
    foreground: "#0f172a",
    background: "#ffffff",
    minimumRatio: 4.5,
  },
  {
    id: "workspace-description-on-canvas",
    foreground: "#475569",
    background: "#ffffff",
    minimumRatio: 4.5,
  },
  {
    id: "contextual-panel-title-on-surface",
    foreground: "#0f172a",
    background: "#ffffff",
    minimumRatio: 4.5,
  },
  {
    id: "contextual-panel-body-on-surface",
    foreground: "#475569",
    background: "#ffffff",
    minimumRatio: 4.5,
  },
  {
    id: "content-panel-primary-on-standard",
    foreground: "#0f172a",
    background: "#ffffff",
    minimumRatio: 4.5,
  },
];
