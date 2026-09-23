import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "/tmp/w08-stage-worktree/prisma/schema.prisma",
  migrations: {
    path: "/tmp/w08-pre-upgrade-migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
