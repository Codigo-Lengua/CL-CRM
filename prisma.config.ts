import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  // Un archivo por módulo en prisma/schema (docs/flujo-de-trabajo.md §5).
  schema: "prisma/schema",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // `prisma generate` no necesita base de datos (build de Docker y npm ci); migrar sí.
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
