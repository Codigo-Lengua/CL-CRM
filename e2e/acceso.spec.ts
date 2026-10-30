import { type Browser, expect, type Page, test } from "@playwright/test";
import { idInvitacionPendiente } from "./utilidades/base-de-datos";
import { type DatosE2E, leerDatos } from "./utilidades/datos";
import { codigoTotp, msHastaSiguienteCodigo } from "./utilidades/totp";

// Flujo de acceso completo (#4): ingreso, dos pasos, invitación y permisos por rol.
// Corre en serie: cada paso deja el estado que necesita el siguiente.
// Los localizadores filtran por visibles: el router de Next guarda ocultas las rutas ya
// visitadas, y sin el filtro un texto aparece dos veces.
test.describe.configure({ mode: "serial" });

let datos: DatosE2E;
let admin: Page;
let secretoTotp = "";

async function ingresar(pagina: Page, email: string, contrasena: string) {
  await pagina.goto("/ingresar");
  await pagina.getByLabel("Correo").fill(email);
  await pagina.getByLabel("Contraseña").fill(contrasena);
  await pagina.getByRole("button", { name: "Ingresar" }).click();
}

async function nuevaPagina(browser: Browser) {
  return (await browser.newContext()).newPage();
}

test.beforeAll(async ({ browser }) => {
  datos = leerDatos();
  admin = await nuevaPagina(browser);
});

test("sin sesión, el inicio lleva a ingresar", async () => {
  await admin.goto("/");
  await expect(admin).toHaveURL(/\/ingresar$/);
});

test("una contraseña mala muestra el error y conserva el correo", async () => {
  await ingresar(admin, datos.admin.email, "no-es-la-clave");
  await expect(admin.locator("p[role=alert]").filter({ visible: true })).toHaveText(
    "El correo o la contraseña no coinciden.",
  );
  await expect(admin.getByLabel("Correo").filter({ visible: true })).toHaveValue(datos.admin.email);
});

test("el ADMIN debe activar dos pasos antes de trabajar", async () => {
  await ingresar(admin, datos.admin.email, datos.admin.contrasena);
  await expect(admin).toHaveURL(/\/dos-pasos\/configurar$/);
  await expect(
    admin.getByText("Tu rol exige verificación en dos pasos").filter({ visible: true }),
  ).toBeVisible();

  await admin.getByLabel("Confirma tu contraseña").filter({ visible: true }).fill(datos.admin.contrasena);
  await admin.getByRole("button", { name: "Continuar" }).filter({ visible: true }).click();
  await expect(
    admin.getByAltText("Código QR para la app de autenticación").filter({ visible: true }),
  ).toBeVisible();
  secretoTotp = (await admin.locator("code").filter({ visible: true }).textContent())?.trim() ?? "";
  expect(secretoTotp).toMatch(/^[A-Z2-7]+$/);

  await admin.getByLabel("Código").filter({ visible: true }).fill(codigoTotp(secretoTotp));
  await admin.getByRole("button", { name: "Activar" }).filter({ visible: true }).click();
  await expect(
    admin.getByRole("heading", { name: "Hola, Admin E2E" }).filter({ visible: true }),
  ).toBeVisible();
  await expect(admin.getByText("Ingresaste como Administrador.").filter({ visible: true })).toBeVisible();
});

test("al volver a ingresar pide el código de la app", async () => {
  test.setTimeout(60_000);
  await admin.getByRole("button", { name: "Cerrar sesión" }).filter({ visible: true }).click();
  await expect(admin).toHaveURL(/\/ingresar$/);
  await ingresar(admin, datos.admin.email, datos.admin.contrasena);
  await expect(admin).toHaveURL(/\/dos-pasos$/);

  // El código con que se activó ya se usó: se espera al siguiente.
  await admin.waitForTimeout(msHastaSiguienteCodigo());
  await admin.getByLabel("Código de 6 dígitos").filter({ visible: true }).fill(codigoTotp(secretoTotp));
  await admin.getByRole("button", { name: "Verificar" }).filter({ visible: true }).click();
  await expect(
    admin.getByRole("heading", { name: "Hola, Admin E2E" }).filter({ visible: true }),
  ).toBeVisible();
});

test("el ADMIN invita a una asesora desde Equipo", async () => {
  await admin.goto("/configuracion/equipo");
  await admin.getByLabel("Correo").filter({ visible: true }).fill(datos.invitada.email);
  await admin.locator("select[name=rol]").filter({ visible: true }).selectOption("ASESOR");
  await admin.getByRole("button", { name: "Enviar invitación" }).filter({ visible: true }).click();
  await expect(
    admin.getByText(`Invitación creada para ${datos.invitada.email}`).filter({ visible: true }),
  ).toBeVisible();
  await expect(
    admin.getByRole("listitem").filter({ visible: true }).filter({ hasText: datos.invitada.email }),
  ).toBeVisible();
});

test("la invitada crea su cuenta, entra como Asesor y no puede administrar el equipo", async ({
  browser,
}) => {
  const invitacion = { id: await idInvitacionPendiente(datos.invitada.email) };
  const invitada = await nuevaPagina(browser);

  await invitada.goto(`/invitacion/${invitacion.id}`);
  await expect(
    invitada.getByRole("heading", { name: `Únete a ${datos.organizacion}` }).filter({ visible: true }),
  ).toBeVisible();
  await expect(invitada.getByText("Te invitaron con el rol Asesor.").filter({ visible: true })).toBeVisible();
  await invitada.getByLabel("Nombre completo").filter({ visible: true }).fill(datos.invitada.nombre);
  await invitada.getByLabel("Contraseña").filter({ visible: true }).fill(datos.invitada.contrasena);
  await invitada.getByLabel("Repítela").filter({ visible: true }).fill(datos.invitada.contrasena);
  await invitada.getByRole("button", { name: "Crear cuenta y unirme" }).filter({ visible: true }).click();

  await expect(
    invitada.getByRole("heading", { name: `Hola, ${datos.invitada.nombre}` }).filter({ visible: true }),
  ).toBeVisible();
  await expect(invitada.getByText("Ingresaste como Asesor.").filter({ visible: true })).toBeVisible();

  await invitada.goto("/configuracion/equipo");
  await expect(invitada.getByRole("alert").filter({ hasText: "Solo un administrador" })).toHaveText(
    "Solo un administrador puede gestionar el equipo.",
  );

  await invitada.goto(`/invitacion/${invitacion.id}`);
  await expect(
    invitada.getByRole("heading", { name: "Invitación no disponible" }).filter({ visible: true }),
  ).toBeVisible();
});

test("el ADMIN ve a la asesora en el equipo", async () => {
  await admin.goto("/configuracion/equipo");
  const fila = admin.getByRole("row").filter({ visible: true }).filter({ hasText: datos.invitada.email });
  await expect(fila).toContainText(datos.invitada.nombre);
  await expect(fila.getByRole("combobox")).toHaveValue("ASESOR");
});
