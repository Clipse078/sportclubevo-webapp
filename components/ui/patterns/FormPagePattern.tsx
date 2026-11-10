import type { ReactNode } from "react";
import type { BreadcrumbItem } from "@/components/ui/page";
import { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";
import { ActionBar } from "@/components/ui";
import { cn } from "@/lib/cn";

export type FormPagePatternProps = {
  // ── Header ────────────────────────────────────────────────────────────────
  /** Short uppercase eyebrow label above the title. */
  eyebrow?: string;
  /** Primary page title (e.g. "Neues Team erstellen", "Team bearbeiten"). */
  title: string;
  /** Optional supporting description. */
  description?: string;
  /** Breadcrumb trail shown above the header. */
  breadcrumbs?: BreadcrumbItem[];
  /** Finance-style horizontal tabs below the page header. */
  contextTabs?: ReactNode;
  // ── Form content ───────────────────────────────────────────────────────────
  /**
   * Grouped form sections — typically <FormSection> children.
   * Each FormSection renders a title/description column + fields column and
   * provides its own border-b separator.
   */
  children: ReactNode;
  // ── Validation ────────────────────────────────────────────────────────────
  /**
   * Optional validation / error summary rendered between the form content
   * and the action bar. Useful for server-side error messages.
   */
  validationSummary?: ReactNode;
  // ── Actions ────────────────────────────────────────────────────────────────
  /**
   * Primary save / submit action (right side of action bar).
   * Example: <Button type="submit">Speichern</Button>
   */
  primaryAction?: ReactNode;
  /**
   * Cancel / secondary action (left side of action bar when primaryAction
   * is also provided, otherwise right-aligned).
   * Example: <Button variant="secondary" onClick={router.back}>Abbrechen</Button>
   */
  cancelAction?: ReactNode;
  /**
   * Stick the action bar to the bottom of the viewport so Save/Cancel
   * remain reachable without scrolling. @default true
   */
  stickyActions?: boolean;
  // ── Shell ──────────────────────────────────────────────────────────────────
  className?: string;
};

/**
 * FormPagePattern
 *
 * Reusable structural shell for create / edit form pages.
 * Composes: SceWorkspaceChrome · ActionBar · FormSection (children)
 *
 * Does NOT include PageShell — callers wrap with <PageShell fullWidth> when
 * using inside the admin layout.
 *
 * Structure:
 *   breadcrumbs → header → grouped form sections (children)
 *   → validation summary → sticky action bar (cancel | save)
 *
 * Usage:
 *   <PageShell fullWidth>
 *     <FormPagePattern
 *       eyebrow="Teams"
 *       title="Neues Team erstellen"
 *       breadcrumbs={[
 *         { label: "Dashboard", href: "/dashboard" },
 *         { label: "Teams", href: "/dashboard/teams" },
 *         { label: "Neues Team" },
 *       ]}
 *       primaryAction={<Button type="submit" loading={isPending}>Speichern</Button>}
 *       cancelAction={<Button variant="secondary" onClick={router.back}>Abbrechen</Button>}
 *     >
 *       <FormSection title="Grunddaten" description="Name und Typ des Teams.">
 *         <InputField label="Name" … />
 *       </FormSection>
 *       <FormSection title="Kontakt">
 *         <InputField label="E-Mail" … />
 *       </FormSection>
 *     </FormPagePattern>
 *   </PageShell>
 */
export function FormPagePattern({
  eyebrow,
  title,
  description,
  breadcrumbs,
  contextTabs,
  children,
  validationSummary,
  primaryAction,
  cancelAction,
  stickyActions = true,
  className,
}: FormPagePatternProps) {
  const hasActions = !!(primaryAction ?? cancelAction);
  const hasBothActions = !!(primaryAction && cancelAction);

  return (
    <SceWorkspaceChrome
      className={cn("flex flex-col", className)}
      breadcrumbs={breadcrumbs}
      contextTabs={contextTabs}
      header={{
        eyebrow,
        title,
        description,
      }}
    >
      <div className="flex flex-col">{children}</div>

      {validationSummary ? <div className="mt-4">{validationSummary}</div> : null}

      {hasActions ? (
        <ActionBar
          sticky={stickyActions}
          align={hasBothActions ? "between" : "right"}
          className="mt-6"
        >
          {cancelAction}
          {primaryAction}
        </ActionBar>
      ) : null}
    </SceWorkspaceChrome>
  );
}
