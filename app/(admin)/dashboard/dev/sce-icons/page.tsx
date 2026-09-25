import { notFound } from "next/navigation";

import { SceIconSpecimen } from "@/components/design-system/icons/specimen/SceIconSpecimen";

export default function SceIconsDevSpecimenPage() {
  const previewAllowed =
    process.env.NODE_ENV === "development" ||
    process.env.VERCEL_GIT_COMMIT_REF === "STAGE";

  if (!previewAllowed) {
    notFound();
  }

  return <SceIconSpecimen />;
}
