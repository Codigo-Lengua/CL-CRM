import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const integracion = process.env.VITEST_INTEGRACION === "1";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // Las pruebas *.int.test.ts necesitan PostgreSQL y corren con npm run test:integracion.
    include: integracion ? ["src/**/*.int.test.ts"] : ["src/**/*.test.ts"],
    exclude: integracion ? [] : ["src/**/*.int.test.ts", "node_modules/**"],
    environment: "node",
    setupFiles: integracion ? ["dotenv/config"] : [],
  },
});
