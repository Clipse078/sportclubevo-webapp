import "dotenv/config";
import { prisma } from "@/lib/db/prisma";

async function main() {
  const tenant = await prisma.tenant.findUnique({
    where: { key: "fc-allschwil" },
    select: { id: true },
  });
  const teamCount = tenant
    ? await prisma.team.count({ where: { tenantId: tenant.id } })
    : 0;
  console.log(JSON.stringify({ teamCount }));
}

main()
  .finally(() => prisma.$disconnect())
  .catch(() => process.exit(1));
