import { expect, type Page } from "@playwright/test";

export const PASSWORD = "Pizarron-Azul-2026";
export const NEW_PASSWORD = "Cuaderno-Rojo-2027";

/** Correo único por prueba: las cuentas de e2e se distinguen por su dominio. */
export function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@e2e.example.com`;
}

/** Día de la semana ISO (1 = lunes … 7 = domingo) de hoy en la Ciudad de México. */
export function todayWeekday(): number {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Mexico_City",
    weekday: "short",
  }).format(new Date());
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(name) + 1;
}

export async function registerTeacher(page: Page, email: string): Promise<void> {
  await page.goto("/registro");
  await page.getByLabel("Nombre(s)").fill("Laura Elena");
  await page.getByLabel("Apellido paterno").fill("Méndez");
  await page.getByLabel("Apellido materno").fill("Ortiz");
  await page.getByLabel("Correo electrónico").fill(email);
  // Los obligatorios llevan «(obligatorio)» en su nombre accesible: se ubican por id.
  await page.locator("#password").fill(PASSWORD);
  await page.locator("#password_confirmation").fill(PASSWORD);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page).toHaveURL(/\/panel$/);
}

export async function login(page: Page, email: string, password = PASSWORD): Promise<void> {
  await expect(page.getByRole("heading", { level: 1, name: "Iniciar sesión" })).toBeVisible();
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
}

/** Ninguna página debe desplazarse a lo ancho (diseño para 390 px). */
export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}
