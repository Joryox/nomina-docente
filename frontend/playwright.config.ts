import { defineConfig, devices } from "@playwright/test";

/**
 * Pruebas de punta a punta contra el sistema en marcha (`bash scripts/dev.sh`). Usan el
 * Microsoft Edge o Google Chrome instalado (`E2E_BROWSER_CHANNEL`), así que no descargan
 * navegadores. Cada corrida registra cuentas nuevas con correos `@e2e.example.com`.
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const channel = process.env.E2E_BROWSER_CHANNEL ?? "msedge";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL,
    channel,
    locale: "es-MX",
    timezoneId: "America/Mexico_City",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "escritorio", use: { ...devices["Desktop Chrome"], channel } },
    {
      name: "celular",
      use: { ...devices["Pixel 7"], channel, viewport: { width: 390, height: 844 } },
    },
  ],
});
