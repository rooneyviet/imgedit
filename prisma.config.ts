import { defineConfig } from "prisma/config";

try {
  process.loadEnvFile?.(".env");
} catch {}

try {
  process.loadEnvFile?.(".env.local");
} catch {}

try {
  process.loadEnvFile?.(".env.production");
} catch {}

const directUrl = process.env.DIRECT_URL;
const databaseUrl = process.env.DATABASE_URL;
const datasourceUrl = directUrl || databaseUrl;

if (!datasourceUrl) {
  throw new Error("DIRECT_URL or DATABASE_URL is required for Prisma");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: datasourceUrl,
  },
});
