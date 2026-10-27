import { expect, test, type Page } from "@playwright/test";

import {
  expectNoHorizontalOverflow,
  login,
  NEW_PASSWORD,
  registerTeacher,
  todayWeekday,
  uniqueEmail,
} from "./helpers";

const WEEKDAYS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

async function chooseFromCombobox(page: Page, label: string, search: string) {
  await page.getByRole("combobox", { name: label }).click();
  await page.getByPlaceholder("Escribe para buscar…").fill(search);
  await page.getByRole("option").first().click();
}

/** Sigue la guía de configuración: materia, asignación y un horario de hoy que ya terminó. */
async function completeSetup(page: Page) {
  const guide = page.getByRole("region", { name: "Configura tu cuenta" });
  await expect(guide).toBeVisible();
  await expect(guide.getByText("0 de 3 pasos completos")).toBeVisible();

  await guide.getByRole("button", { name: "Agregar materia" }).click();
  const subjectDialog = page.getByRole("dialog", { name: "Agregar materia" });
  await subjectDialog.getByLabel("Nombre de la materia").fill("bases   de datos");
  await subjectDialog.getByRole("button", { name: "Guardar materia" }).click();
  await expect(page.getByText("Materia «Bases de Datos» registrada")).toBeVisible();
  await expect(guide.getByText("1 de 3 pasos completos")).toBeVisible();

  await guide.getByRole("button", { name: "Crear clase" }).click();
  const assignmentDialog = page.getByRole("dialog", { name: "Nueva clase" });
  await chooseFromCombobox(page, "Materia", "bases");
  await chooseFromCombobox(page, "Carrera", "sistemas");
  await assignmentDialog.getByRole("combobox", { name: "Tarifa por hora" }).click();
  await page.getByRole("option", { name: "$135.00" }).click();
  await assignmentDialog.getByRole("button", { name: "Crear clase" }).click();
  await expect(guide.getByText("2 de 3 pasos completos")).toBeVisible();

  await guide.getByRole("button", { name: "Agregar horario" }).click();
  const scheduleDialog = page.getByRole("dialog", { name: "Agregar horario" });
  await chooseFromCombobox(page, "Clase", "bases");
  await scheduleDialog.getByRole("combobox", { name: "Día de la semana" }).click();
  await page.getByRole("option", { name: WEEKDAYS[todayWeekday() - 1] }).click();
  await scheduleDialog.getByLabel("Hora de entrada").fill("00:00");
  await scheduleDialog.getByLabel("Hora de salida").fill("00:50");
  await scheduleDialog.getByLabel("Hora de salida").blur();
  await scheduleDialog.getByRole("button", { name: "Guardar horario" }).click();
  await expect(guide).toBeHidden();
}

test.describe("panel", () => {
  test("un docente nuevo configura su cuenta y registra su clase de hoy en un clic", async ({
    page,
  }) => {
    await registerTeacher(page, uniqueEmail("guia"));
    await expect(page).toHaveTitle(/^Inicio · /);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Laura");
    await expectNoHorizontalOverflow(page);
    await completeSetup(page);

    await expect(page.getByText("Monto estimado")).toBeVisible();
    await expect(page.getByText(/El importe final se fija al emitir el recibo/)).toBeVisible();
    const today = page.getByRole("region", { name: "Clases de hoy" });
    await expect(today.getByText("Bases de Datos")).toBeVisible();
    await today.getByRole("button", { name: /Registrar Bases de Datos, 00:00–00:50/ }).click();
    await expect(page.getByText("Clase registrada en tu bitácora")).toBeVisible();
    await expect(today.getByText("Registrada")).toBeVisible();
    await expect(page.getByRole("region", { name: "Últimos recibos" })).toContainText(
      "Aún no tienes recibos emitidos.",
    );
    await expectNoHorizontalOverflow(page);
  });

  test("la navegación solo muestra secciones que existen", async ({ page }) => {
    await registerTeacher(page, uniqueEmail("navegacion"));
    await expect(page.getByText("Pronto")).toHaveCount(0);
    await expect(page.getByText(/etapa|provisional|temporal/i)).toHaveCount(0);
    await page.getByRole("button", { name: /Menú de la cuenta/ }).click();
    await expect(page.getByRole("menuitem", { name: "Mi perfil" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Cambiar contraseña" })).toBeVisible();
  });

  test("mi perfil: edita datos, cambia la contraseña y cierra todas las sesiones", async ({
    page,
  }) => {
    const email = uniqueEmail("perfil");
    await registerTeacher(page, email);
    await page.goto("/panel/perfil");
    await expect(page).toHaveTitle(/^Mi perfil · /);
    await expect(page.getByLabel("Correo electrónico")).toHaveValue(email);
    await expect(page.getByLabel("Correo electrónico")).toHaveAttribute("readonly", "");
    await expect(page.getByText("Inicio de sesión más reciente")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByLabel(/Número de empleado/).fill(`E2E-${Date.now()}`);
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Datos guardados")).toBeVisible();

    await page.locator("#current_password").fill("No-Es-La-Mia-1");
    await page.locator("#new_password").fill(NEW_PASSWORD);
    await page.locator("#new_password_confirmation").fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Cambiar contraseña" }).click();
    await expect(page.getByText("La contraseña actual no es correcta.")).toBeVisible();

    await page.locator("#current_password").fill("Pizarron-Azul-2026");
    await page.getByRole("button", { name: "Cambiar contraseña" }).click();
    await expect(page.getByText("Contraseña actualizada")).toBeVisible();
    await expect(page.getByText(/Cerramos tu sesión en los demás dispositivos/)).toBeVisible();

    await page.getByRole("button", { name: "Cerrar sesión en todos los dispositivos" }).click();
    const confirm = page.getByRole("alertdialog");
    await expect(confirm.getByRole("button", { name: "Cancelar" })).toBeFocused();
    await confirm.getByRole("button", { name: "Cerrar todas las sesiones" }).click();
    await expect(page).toHaveURL(/\/iniciar-sesion$/);

    await login(page, email, NEW_PASSWORD);
    await expect(page).toHaveURL(/\/panel$/);
  });
});
