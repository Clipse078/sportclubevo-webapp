import type { ReactNode } from "react";

type CommunicationInboxLayoutProps = {
  children: ReactNode;
};

/** Inbox segment layout — module surface is provided by `communication/layout.tsx`. */
export default function CommunicationInboxLayout({
  children,
}: CommunicationInboxLayoutProps) {
  return children;
}
