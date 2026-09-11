import { prisma } from "@/lib/db/prisma";

export function slugifyBillingKey(source: string): string {
  return (
    source
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "billing"
  );
}

type UniqueKeyModel =
  | "billingCustomer"
  | "legalEntity"
  | "billingContract"
  | "invoice";

async function keyExists(model: UniqueKeyModel, key: string): Promise<boolean> {
  if (model === "billingCustomer") {
    const row = await prisma.billingCustomer.findUnique({
      where: { key },
      select: { id: true },
    });
    return row !== null;
  }
  if (model === "billingContract") {
    const row = await prisma.billingContract.findUnique({
      where: { key },
      select: { id: true },
    });
    return row !== null;
  }
  if (model === "invoice") {
    const row = await prisma.invoice.findUnique({
      where: { key },
      select: { id: true },
    });
    return row !== null;
  }
  const row = await prisma.legalEntity.findUnique({
    where: { key },
    select: { id: true },
  });
  return row !== null;
}

export async function allocateUniqueBillingKey(
  model: UniqueKeyModel,
  preferredBase: string,
): Promise<string> {
  const base = slugifyBillingKey(preferredBase);
  if (!(await keyExists(model, base))) {
    return base;
  }
  for (let i = 2; i < 1000; i += 1) {
    const candidate = `${base}-${i}`;
    if (!(await keyExists(model, candidate))) {
      return candidate;
    }
  }
  throw new Error("Unable to allocate unique billing business key.");
}
