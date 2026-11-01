import { readFileSync } from "node:fs";
import readXlsxFile from "read-excel-file/node";
import { describe, expect, it } from "vitest";
import { aDia, aNumero, type Celda, leerCatalogo } from "../dominio/importacion/lectura";
import { type EstadoCatalogo, planearImportacion } from "../dominio/importacion/plan";
import { tablaDeEjemplo } from "../dominio/importacion/plantilla";
import { ErrorArchivo, leerArchivo } from "../infraestructura/archivos";
import { escribirCsv, leerCsv } from "../infraestructura/archivos/csv";
import { comoTabla } from "../infraestructura/archivos/pdf";
import { plantillaExcel } from "../infraestructura/archivos/plantilla";
import { MARCA_CODIGO_LENGUA } from "@/modules/marca/dominio/marca";
import { derivarTokens } from "@/modules/marca/dominio/tokens";

const tokens = derivarTokens(MARCA_CODIGO_LENGUA.colores, "claro");
const colores = { fondo: tokens.primario, texto: tokens["sobre-primario"] };

const HOY = "2026-11-01";
const parametros = {
  lineas: ["Sitio web", "Redes", "Publicidad", "Marca", "Software"],
  impuesto: "IVA",
  hoy: HOY,
};
const vacio: EstadoCatalogo = { servicios: [], lineas: [], impuestos: [] };
const ENCABEZADO = [
  "Código",
  "Nombre",
  "Tipo",
  "Plan",
  "Precio",
  "Vigente desde",
  "Costo de terceros",
  "Valor del costo",
];

describe("Importación del catálogo: valores de las celdas", () => {
  it("lee precios en formato colombiano, con símbolo, con decimales y como número de Excel", () => {
    expect(aNumero("1.800.000")).toBe(1_800_000);
    expect(aNumero("$ 1.800.000")).toBe(1_800_000);
    expect(aNumero("1800000,50")).toBe(1_800_000.5);
    expect(aNumero("1,800,000.50")).toBe(1_800_000.5);
    expect(aNumero("1.200")).toBe(1200);
    expect(aNumero(450000)).toBe(450000);
    expect(aNumero("gratis")).toBeNaN();
  });

  it("lee fechas ISO, latinas y de Excel, y rechaza las que no existen", () => {
    expect(aDia("2026-11-01")).toBe("2026-11-01");
    expect(aDia("1/11/2026")).toBe("2026-11-01");
    expect(aDia(new Date("2026-11-01T00:00:00Z"))).toBe("2026-11-01");
    expect(aDia("31/02/2026")).toBeNull();
    expect(aDia("mañana")).toBeNull();
  });
});

describe("Importación del catálogo: lectura de la tabla", () => {
  it("la plantilla de ejemplo se lee sin errores: 3 servicios, 2 planes, 3 precios y 3 costos", () => {
    const lectura = leerCatalogo(tablaDeEjemplo(parametros), HOY);
    expect(lectura.errores).toEqual([]);
    expect(lectura.servicios.map((s) => s.codigo)).toEqual(["WEB-LANDING", "BOT-WA", "MARCA-360"]);
    const bot = lectura.servicios[1]!;
    expect(bot.planes).toEqual([
      { nombre: "Básico", limiteUso: 1000 },
      { nombre: "Pro", limiteUso: 5000 },
    ]);
    expect(lectura.servicios.flatMap((s) => s.precios)).toHaveLength(3);
    expect(lectura.servicios[0]!.costos.map((c) => c.periodicidad)).toEqual(["ANUAL", "UNICO"]);
    expect(lectura.servicios[2]!.requiereCotizacionManual).toBe(true);
  });

  it("encuentra el encabezado aunque haya un título arriba y acepta columnas en otro orden", () => {
    const lectura = leerCatalogo(
      [
        ["Catálogo 2026"],
        [],
        ["precio", "servicio", "CODIGO", "tipo"],
        ["1.000.000", "Web", "web-1", "proyecto"],
      ],
      HOY,
    );
    expect(lectura.errores).toEqual([]);
    expect(lectura.servicios[0]).toMatchObject({ codigo: "WEB-1", nombre: "Web", tipo: "PROYECTO" });
    expect(lectura.servicios[0]!.precios[0]).toMatchObject({ valor: 1_000_000, desde: HOY, fila: 4 });
  });

  it("marca cada error con su fila y sigue leyendo el resto", () => {
    const filas: Celda[][] = [
      ENCABEZADO,
      ["", "Sin código", "Proyecto"],
      ["WEB", "Web", "Diario"],
      ["BOT", "Bot", "Mensual", "Pro", "-5"],
      ["SEO", "SEO", "Proyecto", "", "100", "31/02/2026"],
      ["ADS", "Ads", "Proyecto", "", "", "", "Pauta", ""],
      ["OK", "Bien", "Proyecto", "", "100"],
    ];
    const { errores, servicios } = leerCatalogo(filas, HOY);
    expect(errores.map((e) => e.fila)).toEqual([2, 3, 4, 5, 6]);
    expect(errores[0]!.mensaje).toMatch(/Falta el código/);
    expect(errores[1]!.mensaje).toMatch(/Proyecto o Mensual/);
    expect(errores[2]!.mensaje).toMatch(/negativo/);
    expect(errores[3]!.mensaje).toMatch(/fecha válida/);
    expect(errores[4]!.mensaje).toMatch(/valor del costo/);
    expect(servicios.find((s) => s.codigo === "OK")?.precios).toHaveLength(1);
  });

  it("detecta datos que se contradicen entre filas del mismo código", () => {
    const { errores } = leerCatalogo(
      [ENCABEZADO, ["WEB", "Web", "Proyecto"], ["WEB", "Página web", "Proyecto"], ["WEB", "", "", "Pro"]],
      HOY,
    );
    expect(errores.map((e) => e.mensaje).join(" ")).toMatch(/no coincide con la fila 2/);
    expect(errores.map((e) => e.mensaje).join(" ")).toMatch(/Solo los servicios mensuales tienen planes/);
  });

  it("sin encabezado reconocible, explica cómo debe venir el archivo", () => {
    const { errores } = leerCatalogo(
      [
        ["a", "b"],
        ["1", "2"],
      ],
      HOY,
    );
    expect(errores[0]).toMatchObject({ fila: null, mensaje: expect.stringMatching(/Código y Nombre/) });
  });
});

describe("Importación del catálogo: plan contra lo que ya existe", () => {
  const estado: EstadoCatalogo = {
    lineas: [{ id: "l-web", codigo: "SITIO_WEB", etiqueta: "Sitio web" }],
    impuestos: [{ id: "i-iva", codigo: "IVA" }],
    servicios: [
      {
        id: "s-web",
        codigo: "WEB-LANDING",
        tipo: "PROYECTO",
        precios: [{ id: "p1", valor: 1_800_000, desde: HOY, hasta: null }],
        planes: [],
        costos: [{ id: "c1", concepto: "Dominio y hosting" }],
        impuestoIds: ["i-iva"],
      },
    ],
  };

  it("RN-27 actualiza el existente, reconoce el precio igual y no duplica costos ni impuestos", () => {
    const plan = planearImportacion(leerCatalogo(tablaDeEjemplo(parametros), HOY), estado);
    expect(plan.errores).toEqual([]);
    const web = plan.operaciones[0]!;
    expect(web).toMatchObject({ accion: "ACTUALIZAR", servicioId: "s-web", impuestoIds: [] });
    expect(web.precios[0]!.estado).toBe("IGUAL");
    expect(web.costos.map((c) => c.costoId)).toEqual(["c1", null]);
    expect(web.datos.linea).toEqual({ id: "l-web" });
    expect(plan.resumen).toMatchObject({ crear: 2, actualizar: 1, precios: 2, preciosIguales: 1, costos: 3 });
    expect(plan.resumen.lineasNuevas).toEqual(["Software", "Marca"]);
  });

  it("RN-27 un precio nuevo cierra el anterior; uno que se cruza con un precio cerrado es error", () => {
    const conCierre = {
      ...estado,
      servicios: [
        {
          ...estado.servicios[0]!,
          precios: [{ id: "p1", valor: 1, desde: "2026-01-01", hasta: "2026-12-31" }],
        },
      ],
    };
    const leer = (desde: string) =>
      planearImportacion(
        leerCatalogo([ENCABEZADO, ["WEB-LANDING", "", "", "", "2.000.000", desde]], HOY),
        conCierre,
      );
    expect(leer("2027-01-01").errores).toEqual([]);
    expect(leer("2026-06-01").errores[0]!.mensaje).toMatch(/Se cruza/);
    const abierto = planearImportacion(
      leerCatalogo([ENCABEZADO, ["WEB-LANDING", "", "", "", "2.000.000", "2027-01-01"]], HOY),
      estado,
    );
    expect(abierto.errores).toEqual([]);
    expect(abierto.resumen.precios).toBe(1);
  });

  it("un servicio nuevo necesita nombre y tipo; un impuesto desconocido es error", () => {
    const plan = planearImportacion(
      leerCatalogo(
        [
          [...ENCABEZADO, "Impuestos"],
          ["NUEVO", "", "", "", "100", "", "", "", "ICA"],
        ],
        HOY,
      ),
      vacio,
    );
    const mensajes = plan.errores.map((e) => e.mensaje).join(" ");
    expect(mensajes).toMatch(/falta el nombre/);
    expect(mensajes).toMatch(/falta el tipo/);
    expect(mensajes).toMatch(/impuesto ICA no existe/);
  });
});

describe("Importación del catálogo: formatos de archivo", () => {
  it("CSV: separador punto y coma o coma, comillas, saltos de línea y tildes en Windows-1252", async () => {
    expect(leerCsv('Código;Nombre\r\nA1;"Web; ""pro""\nlínea 2"\r\n')).toEqual([
      ["Código", "Nombre"],
      ["A1", 'Web; "pro"\nlínea 2'],
    ]);
    expect(leerCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
    const latin1 = new Uint8Array([
      0x43, 0xf3, 0x64, 0x69, 0x67, 0x6f, 0x3b, 0x4e, 0x6f, 0x6d, 0x62, 0x72, 0x65,
    ]);
    const { filas } = await leerArchivo("catalogo.csv", latin1);
    expect(filas[0]).toEqual(["Código", "Nombre"]);
  });

  it("CSV: lo que escribe la plantilla se vuelve a leer igual", async () => {
    const csv = escribirCsv(tablaDeEjemplo(parametros));
    const { filas } = await leerArchivo("plantilla.csv", new TextEncoder().encode(csv));
    expect(leerCatalogo(filas, HOY).errores).toEqual([]);
  });

  it("Excel: la plantilla generada trae la hoja Catálogo y la hoja Instrucciones, y se lee sin errores", async () => {
    const libro = await plantillaExcel(parametros, colores);
    const hojas = await readXlsxFile(libro);
    expect(hojas.map((h) => h.sheet)).toEqual(["Catálogo", "Instrucciones"]);
    const { formato, filas } = await leerArchivo("plantilla.xlsx", new Uint8Array(libro));
    expect(formato).toBe("Excel");
    const lectura = leerCatalogo(filas, HOY);
    expect(lectura.errores).toEqual([]);
    expect(lectura.servicios).toHaveLength(3);
  });

  it("PDF: arma la tabla por posición, salta encabezados repetidos y une las celdas partidas", () => {
    const t = (texto: string, x: number) => ({ texto, x, fin: x + texto.length * 4 });
    const tabla = comoTabla([
      [t("Catálogo de servicios", 40)],
      [t("Código", 40), t("Nombre", 120), t("Tipo", 260), t("Precio", 330)],
      [t("WEB-", 40), t("Landing", 120), t("Proyecto", 260), t("1.800.000", 330)],
      [t("LANDING", 40), t("page", 120)],
      [t("Código", 40), t("Nombre", 120), t("Tipo", 260), t("Precio", 330)],
      [t("BOT", 40), t("Bot", 120), t("Mensual", 260), t("450.000", 345)],
    ]);
    expect(tabla.slice(1)).toEqual([
      ["WEB-LANDING", "Landing page", "Proyecto", "1.800.000"],
      ["BOT", "Bot", "Mensual", "450.000"],
    ]);
  });

  it("PDF: el ejemplo descargable se lee completo, con planes, costos y cotización manual", async () => {
    const bytes = new Uint8Array(readFileSync("public/plantillas/catalogo-ejemplo.pdf"));
    const { formato, filas } = await leerArchivo("catalogo-ejemplo.pdf", bytes);
    expect(formato).toBe("PDF");
    const lectura = leerCatalogo(filas, HOY);
    expect(lectura.errores).toEqual([]);
    expect(lectura.servicios.map((s) => [s.codigo, s.precios.length, s.costos.length])).toEqual([
      ["WEB-LANDING", 1, 2],
      ["BOT-WA", 2, 1],
      ["MARCA-360", 0, 0],
    ]);
    expect(lectura.servicios[1]!.linea).toBe("Software a la medida");
    expect(lectura.servicios[2]!.requiereCotizacionManual).toBe(true);
  });

  it("rechaza archivos vacíos, .xls antiguos, otros formatos y archivos que no son lo que dicen", async () => {
    await expect(leerArchivo("a.csv", new Uint8Array())).rejects.toThrow(/vacío/);
    await expect(leerArchivo("a.xls", new Uint8Array([1]))).rejects.toThrow(/\.xlsx/);
    await expect(leerArchivo("a.docx", new Uint8Array([1]))).rejects.toBeInstanceOf(ErrorArchivo);
    await expect(leerArchivo("a.pdf", new TextEncoder().encode("hola"))).rejects.toThrow(/no parece un PDF/);
    await expect(leerArchivo("a.xlsx", new Uint8Array(6 * 1024 * 1024))).rejects.toThrow(/5 MB/);
  });
});
