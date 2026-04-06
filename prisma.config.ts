import { defineConfig, env } from "prisma/config";

try {
  process.loadEnvFile?.(".env");
} catch {}

try {
  process.loadEnvFile?.(".env.local");
} catch {}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
