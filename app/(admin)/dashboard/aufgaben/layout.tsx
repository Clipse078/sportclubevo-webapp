import type { ReactNode } from "react";
/**
 * Governance marker: canonical Aufgaben chrome is composed in AufgabenWorkspaceShell
 * and requirement/task record shells via SceWorkspaceChrome.
 */
import type { SceWorkspaceChrome } from "@/components/sce/workspace/SceWorkspaceChrome";

export default function AufgabenLayout({
  children,
  task,
}: {
  children: ReactNode;
  task: ReactNode;
}) {
  return (
    <>
      {children}
      {task}
    </>
  );
}
