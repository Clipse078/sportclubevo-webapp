import type { ReactNode } from "react";

export default function PrintRouteLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen bg-white text-neutral-900 sce-print-document-canvas"
      data-print-layout="tournament-spielplan"
    >
      {children}
    </div>
  );
}
