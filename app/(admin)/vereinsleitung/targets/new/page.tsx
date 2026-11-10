import { auth } from "@/auth";
import { redirect } from "next/navigation";
import TargetNewPageClient from "@/components/admin/targets/TargetNewPageClient";
import { PageShell } from "@/components/ui/page";
import { FormPagePattern } from "@/components/ui/patterns";

export default async function NewTargetPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <PageShell fullWidth>
      <FormPagePattern
        eyebrow="Ziele"
        title="Neues Ziel erstellen"
        description="Strategisches Ziel mit messbaren Metriken erfassen. Optional eine Vorlage als Ausgangspunkt verwenden."
        breadcrumbs={[
          { label: "Vereinsleitung", href: "/vereinsleitung" },
          { label: "Ziele", href: "/vereinsleitung/targets" },
          { label: "Neues Ziel" },
        ]}
      >
        <TargetNewPageClient layout="composer" />
      </FormPagePattern>
    </PageShell>
  );
}
