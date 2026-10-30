import { defineConfig, devices } from "@playwright/test";

// Pruebas de flujo completo contra el build de producción (npm run build antes).
// Necesitan PostgreSQL con las migraciones aplicadas y DATABASE_URL.
const puerto = 3100;
const url = `http://localhost:${puerto}`;

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/preparar.ts",
  // Los flujos comparten una organización y van en orden: invitar antes de aceptar.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: url, trace: "retain-on-failure", locale: "es-CO", timezoneId: "America/Bogota" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next start -p ${puerto}`,
    url: `${url}/ingresar`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      BETTER_AUTH_URL: url,
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "secreto-solo-para-pruebas-e2e-de-32-caracteres",
      NOMBRE_PRODUCTO: "CRM E2E",
    },
  },
});
