import { searchCommunicationExternalContacts } from "@/lib/communication/external-contacts/external-contact-service";
import type { SceSelectorItem } from "@/lib/sce/list-selector/types";
import {
  SCE_SELECTOR_DEFAULT_BROWSE_LIMIT,
  SCE_SELECTOR_DEFAULT_SEARCH_LIMIT,
  SCE_SELECTOR_MIN_SEARCH_LENGTH,
} from "@/lib/sce/list-selector/sources/constants";

function toItem(row: {
  id: string;
  label: string;
  description?: string | null;
}): SceSelectorItem {
  return {
    id: row.id,
    type: "EXTERNAL_CONTACT",
    label: row.label,
    description: row.description ?? null,
  };
}

export async function browseExternalContactSelectorItems(input: {
  tenantId: string;
  limit?: number;
}): Promise<SceSelectorItem[]> {
  const limit = Math.min(Math.max(input.limit ?? SCE_SELECTOR_DEFAULT_BROWSE_LIMIT, 1), 50);
  const rows = await searchCommunicationExternalContacts({
    tenantId: input.tenantId,
    query: "",
    limit,
  });
  return rows.map((row) => toItem(row));
}

export async function searchExternalContactSelectorItems(input: {
  tenantId: string;
  query: string;
  limit?: number;
}): Promise<SceSelectorItem[]> {
  const term = input.query.trim();
  if (term.length < SCE_SELECTOR_MIN_SEARCH_LENGTH) return [];

  const limit = Math.min(Math.max(input.limit ?? SCE_SELECTOR_DEFAULT_SEARCH_LIMIT, 1), 50);
  const rows = await searchCommunicationExternalContacts({
    tenantId: input.tenantId,
    query: term,
    limit,
  });
  return rows.map((row) => toItem(row));
}
