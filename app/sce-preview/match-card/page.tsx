/**
 * PREVIEW-ONLY — canonical Match card family (SCE-UI-ROLLOUT-01D).
 * No fetch, no database, no authentication change.
 */

import type { Metadata } from "next";
import { SceMatchCardPreviewGallery } from "@/components/sporting-activity/SceMatchCardPreviewGallery";

export const metadata: Metadata = {
  title: "Match Card Preview · SCE Design System",
};

export default function SceMatchCardPreviewPage() {
  return <SceMatchCardPreviewGallery />;
}
