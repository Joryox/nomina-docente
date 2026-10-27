import { test } from "@playwright/test";

import { login } from "./helpers";

const OUT =
  "C:/Users/jorge/AppData/Local/Temp/claude/c--dev-nomina-docente/58f5516e-0225-4db8-a0b8-0fa991400213/scratchpad/qa";

const PAGES = [
  ["inicio", "/panel"],
  ["materias", "/panel/materias"],
  ["clases", "/panel/clases"],
  ["horario", "/panel/horario"],
  ["bitacora", "/panel/bitacora"],
  ["recibos", "/panel/recibos"],
  ["perfil", "/panel/perfil"],
] as const;

for (const scheme of ["light", "dark"] as const) {
  test(`recorrido ${scheme}`, async ({ page }, info) => {
    test.setTimeout(180_000);
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    const tag = `${info.project.name}-${scheme}`;
    await page.goto("/iniciar-sesion");
    await page.screenshot({ path: `${OUT}/${tag}-login.png`, fullPage: true });
    await login(page, "docente.demo@example.com", "Pizarron-Verde-2026");
    await page.waitForURL(/\/panel$/);
    for (const [name, path] of PAGES) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${OUT}/${tag}-${name}.png`, fullPage: true });
    }
    await page.goto("/panel/recibos");
    await page.getByRole("link", { name: /Ver el recibo NOM-/ }).filter({ visible: true }).first().click();
    await page.getByText("Importe con letra").waitFor();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/${tag}-recibo.png`, fullPage: true });
  });
}
