/**
 * Shared Person name search clauses (first, last, display, email, multi-token full name).
 */

import type { Prisma } from "@prisma/client";

export function buildPersonNameSearchOrClauses(term: string): Prisma.PersonWhereInput[] {
  const trimmed = term.trim();
  if (!trimmed) return [];

  const or: Prisma.PersonWhereInput[] = [
    { firstName: { contains: trimmed, mode: "insensitive" } },
    { lastName: { contains: trimmed, mode: "insensitive" } },
    { displayName: { contains: trimmed, mode: "insensitive" } },
    { email: { contains: trimmed, mode: "insensitive" } },
  ];

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const [first, ...rest] = parts;
    const last = rest.join(" ");
    or.push({
      AND: [
        { firstName: { contains: first, mode: "insensitive" } },
        { lastName: { contains: last, mode: "insensitive" } },
      ],
    });
    if (parts.length === 2) {
      or.push({
        AND: [
          { firstName: { contains: last, mode: "insensitive" } },
          { lastName: { contains: first, mode: "insensitive" } },
        ],
      });
    }
  }

  return or;
}