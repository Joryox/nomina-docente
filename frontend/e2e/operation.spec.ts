import { expect, test, type Page } from "@playwright/test";

import {
  expectNoHorizontalOverflow,
  login,
  registerTeacher,
  todayWeekday,
  uniqueEmail,
} from "./helpers";

const WEEKDAYS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const DEMO = { email: "docente.demo@example.com", password: "Pizarron-Verde-2026" };

/** Hoy en la Ciudad de México como [año, mes, día]. */
function todayParts(): [number, number, number] {
  const iso = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(
    new Date(),
  );
  const [year = 0, month = 0, day = 0] = iso.split("-").map(Number);
  return [year, month, day];
}

/** Último día de la quincena anterior: siempre dentro de la antigüedad permitida (30 días). */
function previousPeriodEnd(): { year: number; month: number; day: number } {
  const [year, month, day] = todayParts();
  if (day > 15) {
    return { year, month, day: 15 };
  }
  const last = new Date(Date.UTC(year, month - 1, 0));
  return { year: last.getUTCFullYear(), month: last.getUTCMonth() + 1, day: last.getUTCDate() };
}

async function chooseOption(page: Page, label: string | RegExp, search: string) {
  await page.getByRole("combobox", { name: label }).click();
  await page.getByPlaceholder("Escribe para buscar…").last().fill(search);
  await page.getByRole("option").first().click();
  // Espera a que la lista termine de cerrarse (tiene animación de salida).
  await expect(page.getByPlaceholder("Escribe para buscar…")).toHaveCount(0);
}

async function chooseSelect(page: Page, label: string | RegExp, option: string | RegExp) {
  await page.getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: option }).click();
}

async function chooseDate(
  page: Page,
  label: string | RegExp,
  date: ReturnType<typeof previousPeriodEnd>,
) {
  await page.getByRole("button", { name: label, exact: typeof label === "string" }).click();
  const name = new RegExp(`\\b${date.day} de ${MONTHS[date.month - 1]} de ${date.year}`);
  const day = page.getByRole("button", { name });
  if (!(await day.isVisible())) {
    await page.getByRole("button", { name: /anterior/i }).click();
  }
  await page.getByRole("button", { name }).click();
}

test.describe("operación completa", () => {
  test("un docente nuevo va de cero a descargar su recibo en PDF", async ({ page }, info) => {
    test.skip(info.project.name !== "escritorio", "El flujo largo se prueba en escritorio.");
    test.setTimeout(180_000);
    await registerTeacher(page, uniqueEmail("flujo"));

    // 1. Mis materias: alta y búsqueda sin acentos.
    await page.goto("/panel/materias");
    await expect(page).toHaveTitle(/^Mis materias · /);
    await expect(page.getByText("Aún no registras materias")).toBeVisible();
    await page.getByRole("button", { name: "Agregar materia" }).first().click();
    await page.getByLabel(/Nombre de la materia/).fill("cálculo   diferencial");
    await page.getByRole("button", { name: "Guardar materia" }).click();
    await expect(page.getByText("Materia «Cálculo Diferencial» registrada")).toBeVisible();
    await page.getByLabel("Buscar materia").fill("calculo");
    await expect(page.getByRole("cell", { name: /Cálculo Diferencial/ }).first()).toBeVisible();

    // 2. Mis clases: la materia nueva se crea desde el mismo formulario.
    await page.goto("/panel/clases");
    await page.getByRole("button", { name: "Nueva clase" }).first().click();
    const classDialog = page.getByRole("dialog", { name: "Nueva clase" });
    await classDialog.getByRole("button", { name: /No está en la lista/ }).click();
    await classDialog.getByLabel("Nombre de la materia nueva").fill("redes de computadoras");
    await classDialog.getByRole("button", { name: "Agregar y elegir" }).click();
    await expect(classDialog.getByRole("combobox", { name: /Materia/ })).toContainText(
      "Redes de Computadoras",
    );
    await chooseOption(page, /Carrera/, "sistemas");
    await chooseSelect(page, /Tarifa por hora/, "$135.00 MXN");
    await classDialog.getByRole("button", { name: "Crear clase" }).click();
    await expect(page.getByText("Clase Redes de Computadoras · ISC creada")).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Ingeniería en Sistemas Computacionales" }),
    ).toContainText("$135.00");

    // 3. Horario: alta y empalme explicado (con varios días, no se guarda ninguno).
    const weekday = WEEKDAYS[todayWeekday() - 1] ?? "lunes";
    const otherDay = WEEKDAYS[todayWeekday() % 7] ?? "martes";
    await page.goto("/panel/horario");
    for (const [days, start, end] of [
      [[weekday], "00:00", "00:50"],
      [[otherDay, weekday], "00:30", "01:30"],
    ] as const) {
      await page.getByRole("button", { name: "Agregar horario" }).first().click();
      const dialog = page.getByRole("dialog", { name: "Agregar horario" });
      await chooseOption(page, /Clase/, "redes");
      for (const day of days) {
        await dialog.getByRole("checkbox", { name: day }).click();
      }
      await dialog.getByLabel("Hora de entrada").fill(start);
      await dialog.getByLabel("Hora de salida").fill(end);
      await dialog.getByLabel("Hora de salida").blur();
      await expect(dialog.getByText("Matutino")).toBeVisible();
      await dialog.getByRole("button", { name: /^Guardar \d* ?horarios?$/ }).click();
    }
    await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
      `El ${weekday}, 00:30–01:30 se empalma con Redes de Computadoras · ISC (00:00–00:50). No se guardó ningún horario.`,
    );
    await page.getByRole("dialog").getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByRole("button", { name: /00:30–01:30/ })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /Redes de Computadoras.*00:00–00:50/ }).first(),
    ).toBeVisible();

    // 4. Bitácora: la clase de hoy en un clic y otra sesión fuera de horario.
    await page.goto("/panel/bitacora");
    const scheduled = page.getByRole("region", { name: "Clases programadas" });
    await scheduled.getByRole("button", { name: /Registrar Redes de Computadoras/ }).click();
    await expect(page.getByText("Clase registrada en tu bitácora")).toBeVisible();
    await expect(scheduled.getByText("Registrada")).toBeVisible();

    await page.getByRole("button", { name: "Registrar otra sesión" }).click();
    const entryDialog = page.getByRole("dialog", { name: "Registrar sesión" });
    await chooseOption(page, /^Clase/, "redes");
    const target = previousPeriodEnd();
    await chooseDate(page, /Fecha de la sesión/, target);
    await entryDialog.getByLabel("Hora de entrada").fill("10:00");
    await entryDialog.getByLabel("Hora de salida").fill("11:00");
    await entryDialog.getByLabel("Hora de salida").blur();
    await expect(entryDialog.getByText(/no está en tu horario de ese día/)).toBeVisible();
    await entryDialog.getByRole("button", { name: "Registrar sesión" }).click();
    await expect(page.getByText("Sesión registrada", { exact: true })).toBeVisible();

    // 5. Recibos: vista previa de la quincena terminada, emisión y detalle.
    await page.goto("/panel/recibos");
    await page.getByRole("button", { name: "Revisar esa quincena" }).click();
    const preview = page.getByRole("region", { name: "Vista previa" });
    await expect(preview.getByRole("cell", { name: "Redes de Computadoras" })).toBeVisible();
    await expect(preview).toContainText("$135.00");
    await preview.getByRole("button", { name: "Emitir recibo" }).click();
    const confirm = page.getByRole("alertdialog");
    await expect(confirm).toContainText("1.00 h");
    await expect(confirm).toContainText("quedará cerrada");
    await confirm.getByRole("button", { name: "Emitir recibo" }).click();
    await expect(page).toHaveURL(/\/panel\/recibos\/[0-9a-f-]+$/);
    await expect(page.getByText("Ciento treinta y cinco pesos 00/100 M.N.")).toBeVisible();
    await expect(page.getByText("Nombre y firma de quien autoriza")).toBeVisible();

    // 6. PDF con folio y periodo en el nombre del archivo.
    const downloading = page.waitForEvent("download");
    await page.getByRole("button", { name: /Descargar PDF/ }).click();
    const download = await downloading;
    expect(download.suggestedFilename()).toMatch(
      /^recibo-NOM-\d{6}-Q[12]-\d{6,}-\d{4}-\d{2}-q[12]\.pdf$/,
    );

    // 7. La bitácora de esa quincena quedó cerrada.
    await page.goto("/panel/bitacora");
    await chooseDate(page, "Fecha", target);
    await expect(page.getByText("Cerrada").filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Más acciones para Redes/ })).toHaveCount(0);

    // 8. Una materia con clases activas no se quita: se explica por qué.
    await page.goto("/panel/materias");
    await page.getByRole("button", { name: "Más acciones para Redes de Computadoras" }).click();
    await page.getByRole("menuitem", { name: "Desactivar" }).click();
    await expect(page.getByRole("dialog")).toContainText("tiene clases activas");
  });

  test("una materia en dos grupos y horarios de varios días en una captura", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "escritorio", "La captura se prueba en escritorio.");
    test.setTimeout(120_000);
    await registerTeacher(page, uniqueEmail("grupos"));

    // Dos clases de la misma materia y carrera, distinguidas por el grupo.
    await page.goto("/panel/clases");
    for (const group of ["3101", "3102 b"]) {
      await page.getByRole("button", { name: "Nueva clase" }).first().click();
      const dialog = page.getByRole("dialog", { name: "Nueva clase" });
      if (group === "3101") {
        await dialog.getByRole("button", { name: /No está en la lista/ }).click();
        await dialog.getByLabel("Nombre de la materia nueva").fill("programación web");
        await dialog.getByRole("button", { name: "Agregar y elegir" }).click();
      } else {
        await chooseOption(page, /Materia/, "web");
      }
      await chooseOption(page, /Carrera/, "sistemas");
      await dialog.getByLabel(/Grupo/).fill(group);
      await chooseSelect(page, /Tarifa por hora/, "$125.00 MXN");
      await dialog.getByRole("button", { name: "Crear clase" }).click();
    }
    await expect(
      page.getByText("Clase Programación Web · ISC · Grupo 3102-B creada"),
    ).toBeVisible();
    const careerCard = page.getByRole("region", { name: "Ingeniería en Sistemas Computacionales" });
    await expect(careerCard).toContainText("Grupo 3101");
    await expect(careerCard).toContainText("Grupo 3102-B");

    // Grupo 3101: lunes, miércoles y viernes en la mañana y el martes en la tarde, en una captura.
    await page.goto("/panel/horario");
    await page.getByRole("button", { name: "Agregar horario" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Agregar horario" });
    await chooseOption(page, /Clase/, "3101");
    for (const day of ["lunes", "miércoles", "viernes"]) {
      await dialog.getByRole("checkbox", { name: day }).click();
    }
    await dialog.getByLabel("Hora de entrada").fill("07:00");
    await dialog.getByLabel("Hora de salida").fill("09:00");
    await dialog.getByRole("button", { name: "Agregar otro rango de horas" }).click();
    const second = dialog.getByRole("region", { name: "Rango de horas 2" });
    await second.getByRole("checkbox", { name: "martes" }).click();
    await second.getByLabel("Hora de entrada").fill("14:00");
    await second.getByLabel("Hora de salida").fill("16:00");
    await second.getByLabel("Hora de salida").blur();
    await expect(second.getByText("Vespertino")).toBeVisible();
    await expect(dialog.getByText("Se agregarán 4 horarios a tu semana.")).toBeVisible();
    await dialog.getByRole("button", { name: "Guardar 4 horarios" }).click();
    await expect(page.getByText("4 horarios guardados")).toBeVisible();

    // Grupo 3102-B el lunes en la tarde: la misma materia dos veces el mismo día.
    await page.getByRole("button", { name: "Agregar horario" }).first().click();
    await chooseOption(page, /Clase/, "3102");
    await dialog.getByRole("checkbox", { name: "lunes" }).click();
    await dialog.getByLabel("Hora de entrada").fill("16:00");
    await dialog.getByLabel("Hora de salida").fill("18:00");
    await dialog.getByRole("button", { name: "Guardar horario" }).click();
    await expect(page.getByText("Horario guardado", { exact: true })).toBeVisible();

    const blocks = page.getByRole("button", {
      name: /^Programación Web, Ingeniería en Sistemas Computacionales · Grupo/,
    });
    await expect(blocks).toHaveCount(5);
    await expect(
      page.getByRole("button", { name: /Grupo 3101 · Matutino, lunes 07:00–09:00/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Grupo 3102-B · Vespertino, lunes 16:00–18:00/ }),
    ).toBeVisible();
  });

  test("la cuenta de demostración luce completa en todas las pantallas", async ({ page }) => {
    await page.goto("/iniciar-sesion");
    await login(page, DEMO.email, DEMO.password);
    await expect(page).toHaveURL(/\/panel$/);

    for (const [path, title, content] of [
      ["/panel/materias", "Mis materias", "Bases de Datos"],
      ["/panel/clases", "Mis clases", "Ingeniería en Sistemas Computacionales"],
      ["/panel/horario", "Horario", "de clase a la semana"],
      ["/panel/bitacora", "Bitácora", "Sesiones de la quincena"],
      ["/panel/recibos", "Recibos", "Recibos emitidos"],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
      await expect(page.getByText(content).filter({ visible: true }).first()).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }

    await page
      .getByRole("link", { name: /Ver el recibo NOM-/ })
      .filter({ visible: true })
      .first()
      .click();
    await expect(page.getByText("Importe con letra")).toBeVisible();
    await expect(page.getByText(/pesos \d{2}\/100 M\.N\./)).toBeVisible();
    await expectNoHorizontalOverflow(page);
    const downloading = page.waitForEvent("download");
    await page.getByRole("button", { name: /Descargar PDF/ }).click();
    expect((await downloading).suggestedFilename()).toMatch(/^recibo-NOM-.*\.pdf$/);
  });
});
