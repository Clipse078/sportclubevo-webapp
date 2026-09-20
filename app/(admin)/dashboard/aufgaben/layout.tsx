import type { ReactNode } from "react";

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
