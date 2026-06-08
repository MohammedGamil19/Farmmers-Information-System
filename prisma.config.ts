import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // DATABASE_URL is only required for db push/migrate, not for prisma generate
  ...(process.env["DATABASE_URL"] && {
    datasource: {
      url: process.env["DATABASE_URL"],
    },
  }),
});