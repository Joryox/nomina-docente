import { expect, test } from "@playwright/test";

import {
  expectNoHorizontalOverflow,
  login,
  PASSWORD,
  registerTeacher,
  uniqueEmail,
} from "./helpers";

test.describe("acceso", () => {
  test("la raíz lleva a iniciar sesión y una ruta inexistente muestra el 404", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/iniciar-sesion$/);
    await expect(page).toHaveTitle(/^Iniciar sesión · /);
    await expect(
      page.getByText(/Sistema de nómina para el personal docente/).filter({ visible: true }),
    ).toBeVisible();
    await expect(page.getByRole("group", { name: "Tema de color" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.goto("/no-existe");
    await expect(page.getByRole("heading", { name: "No encontramos esta página" })).toBeVisible();
    await expect(page).toHaveTitle(/^Página no encontrada · /);
  });

  test("las páginas del panel piden sesión y regresan a la página solicitada", async ({ page }) => {
    const email = uniqueEmail("regreso");
    await registerTeacher(page, email);
    await page.getByRole("button", { name: /Menú de la cuenta/ }).click();
    await page.getByRole("menuitem", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/iniciar-sesion$/);

    await page.goto("/panel/perfil");
    await expect(page).toHaveURL(/\/iniciar-sesion\?siguiente=%2Fpanel%2Fperfil$/);
    await login(page, email);
    await expect(page).toHaveURL(/\/panel\/perfil$/);
    await expect(page.getByRole("heading", { level: 1, name: "Mi perfil" })).toBeVisible();
  });

  test("iniciar sesión: error genérico, mostrar contraseña y aviso de bloqueo", async ({
    page,
  }) => {
    const email = uniqueEmail("bloqueo");
    await registerTeacher(page, email);
    await page.context().clearCookies();
    await page.goto("/iniciar-sesion");

    const password = page.getByLabel("Contraseña", { exact: true });
    await password.fill("Una-Prueba-1");
    await expect(password).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Mostrar contraseña" }).click();
    await expect(password).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: "Ocultar contraseña" }).click();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await login(page, email, "Contrasena-Equivocada-1");
      await expect(
        page.getByRole("alert").filter({ hasText: "Correo o contraseña incorrectos" }),
      ).toBeVisible();
    }
    await login(page, email, PASSWORD);
    const notice = page.getByRole("status").filter({ hasText: "bloqueada temporalmente" });
    await expect(notice).toBeVisible();
    await expect(notice).toContainText(/podrás volver a entrar en \d+ minutos/);
    await expect(page).toHaveURL(/\/iniciar-sesion$/);
  });

  test("registro: valida al salir del campo, confirma la contraseña y marca requisitos", async ({
    page,
  }) => {
    await page.goto("/registro");
    await expect(page.getByRole("group", { name: /Datos personales/ })).toBeVisible();
    await expect(page.getByRole("group", { name: /Datos de acceso/ })).toBeVisible();

    await page.getByLabel("Nombre(s)").focus();
    await page.getByLabel("Apellido paterno").focus();
    await expect(page.getByText("Este campo es obligatorio.").first()).toBeVisible();

    await page.getByLabel("Nombre(s)").fill("Laura");
    const password = page.locator("#password");
    await password.fill("laura2026xyzw");
    const requirements = page.locator("#password-requisitos");
    await expect(requirements.getByText(/Tener al menos 12 caracteres\..*cumplido/)).toBeVisible();
    await expect(requirements.getByText(/No contener tu nombre.*pendiente/)).toBeVisible();

    await page.locator("#password_confirmation").fill("otra-cosa-1");
    await page.locator("#password_confirmation").blur();
    await expect(page.getByText("Las contraseñas no coinciden.", { exact: false })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
