import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "bun prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/sales_crm",
  },
});
