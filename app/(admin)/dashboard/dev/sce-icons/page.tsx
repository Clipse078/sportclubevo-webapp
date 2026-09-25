import { notFound } from "next/navigation";

import { isSceIconSpecimenAvailable } from "@/components/design-system/icons/sce-icon-specimen-gate";
import { SceIconSpecimen } from "@/components/design-system/icons/specimen/SceIconSpecimen";

export default function SceIconsDevSpecimenPage() {
  if (!isSceIconSpecimenAvailable()) {
    notFound();
  }

  return <SceIconSpecimen />;
}
