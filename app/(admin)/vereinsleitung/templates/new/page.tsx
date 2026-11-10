import { auth } from "@/auth";
import { redirect } from "next/navigation";
import TemplateForm from "@/components/admin/templates/TemplateForm";
import { PageShell } from "@/components/ui/page";
import { FormPagePattern } from "@/components/ui/patterns";

export default async function NewTemplatePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return (
    <PageShell fullWidth>
      <FormPagePattern
        eyebrow="Kommunikation"
        title="Neue Vorlage"
        description="Erstelle eine kontextbewusste Kommunikationsvorlage mit Variablen."
        breadcrumbs={[
          { label: "Vereinsleitung", href: "/vereinsleitung" },
          { label: "Vorlagen", href: "/vereinsleitung/templates" },
          { label: "Neue Vorlage" },
        ]}
      >
        <TemplateForm mode="create" />
      </FormPagePattern>
    </PageShell>
  );
}
