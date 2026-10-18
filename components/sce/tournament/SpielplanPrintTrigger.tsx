"use client";

import { useEffect } from "react";

/** Opens the browser print dialog once the print document has mounted. */
export default function SpielplanPrintTrigger() {
  useEffect(() => {
    window.print();
  }, []);
  return null;
}
