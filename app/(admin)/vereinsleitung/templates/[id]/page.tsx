import Link from "next/link";
import {
  VEREINSLEITUNG_INNER_ROW_CLASS,
  VEREINSLEITUNG_PANEL_CLASS,
  VEREINSLEITUNG_SECONDARY_CHROME_LINK,
} from "@/components/admin/vereinsleitung/vereinsleitungSurfaceStyles";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { renderTemplate, buildSampleContext, extractVariableKeys, TEMPLATE_VARIABLES } from "@/lib/communication/variables";
import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import ReviewStageBadge from "@/components/admin/shared/ReviewStageBadge";
import { ArrowLeft, Edit, Sparkles } from "lucide-react";

type PageProps = { params: Promise<{ id: string }> };

const CATEGORY_LABELS: Record<string, string> = {
  GENERAL: "Allgemein", MATCH_INVITATION: "Spieleinladung", MEETING_FOLLOWUP: "Meeting Nachfass",
  INITIATIVE_UPDATE: "Initiativupdate", TARGET_PROGRESS: "Zielfortschritt",
  TOURNAMENT_REMINDER: "Turniererinnerung", GOVERNANCE_FOLLOWUP: "Governance Nachfass",
  SPONSOR_OUTREACH: "Sponsorenansprache", PARENT_COMMUNICATION: "Elterninformation",
};

export default async function TemplateDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const template = await prisma.communicationTemplate.findUnique({ where: { id } });
  if (!template) notFound();

  const sampleCtx = buildSampleContext();
  const previewSubject = renderTemplate(template.subject, sampleCtx);
  const previewBody = renderTemplate(template.bodyMarkdown, sampleCtx);
  const usedKeys = extractVariableKeys(template.subject + "\n" + template.bodyMarkdown);

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        eyebrow="Kommunikation"
        title={template.title}
        description={`${CATEGORY_LABELS[template.category] ?? template.category}${template.moduleKey ? ` · ${template.moduleKey}` : ""}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/vereinsleitung/templates" className={VEREINSLEITUNG_SECONDARY_CHROME_LINK}>
              <ArrowLeft className="h-4 w-4" />Zurück
            </Link>
            <Link href={`/vereinsleitung/templates/${id}/edit`} className="inline-flex items-center gap-1.5 rounded-full bg-[#0b4aa2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#08357a]">
              <Edit className="h-4 w-4" />Bearbeiten
            </Link>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <ReviewStageBadge stage={template.reviewStage} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          <section className={VEREINSLEITUNG_PANEL_CLASS}>
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#0b4aa2]" />
              <h3 className="text-[1.05rem] font-semibold text-[var(--foreground)]">Vorschau (Beispieldaten)</h3>
            </div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">Betreff</p>
            <p className="mb-5 rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm font-medium text-[var(--foreground)]">{previewSubject}</p>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">Inhalt</p>
            <pre className="whitespace-pre-wrap rounded-[14px] border border-slate-100 bg-slate-50 p-4 font-sans text-sm leading-7 text-[var(--foreground)]">{previewBody}</pre>
          </section>

          <section className={VEREINSLEITUNG_PANEL_CLASS}>
            <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--text-2)]">Rohinhalt (Markdown)</h3>
            <pre className="whitespace-pre-wrap rounded-[14px] border border-slate-100 bg-slate-50 p-4 font-mono text-[12px] leading-6 text-[var(--text-2)]">{template.bodyMarkdown}</pre>
          </section>
        </div>

        <aside className="space-y-5">
          <section className={VEREINSLEITUNG_PANEL_CLASS}>
            <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--text-2)]">Verwendete Variablen</h3>
            {usedKeys.length === 0 ? <p className="text-[12px] text-slate-400 italic">Keine Variablen verwendet.</p> : (
              <div className="space-y-2">
                {usedKeys.map((k) => {
                  const def = TEMPLATE_VARIABLES.find((v) => v.key === k);
                  return (
                    <div key={k} className="rounded-[12px] border border-slate-100 bg-slate-50 px-3 py-2">
                      <p className="font-mono text-[11px] text-[#0b4aa2]">{`{{${k}}}`}</p>
                      {def ? <p className="mt-0.5 text-[10px] text-[var(--text-2)]">{def.label} · Bsp: {def.example}</p> : <p className="mt-0.5 text-[10px] text-amber-600">Unbekannte Variable</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
