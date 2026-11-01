// Genera public/plantillas/catalogo-ejemplo.pdf a partir del mismo formato que la plantilla de
// Excel y CSV. Se vuelve a correr cuando cambian las columnas: npm run plantilla-catalogo-pdf
import { writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { tablaDeEjemplo } from "../src/modules/catalogo/dominio/importacion/plantilla";
import { MARCA_CODIGO_LENGUA } from "../src/modules/marca/dominio/marca";
import { derivarTokens } from "../src/modules/marca/dominio/tokens";
import { PLANTILLA_CODIGO_LENGUA } from "../src/modules/parametros/dominio/plantilla";

// Colores de la marca por defecto en modo claro, los mismos tokens que usa el CRM.
const t = derivarTokens(MARCA_CODIGO_LENGUA.colores, "claro");

const escapar = (v: unknown) =>
  String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const formato = (v: string | number | null) =>
  typeof v === "number" ? new Intl.NumberFormat("es-CO").format(v) : (v ?? "");

const lineas = PLANTILLA_CODIGO_LENGUA.catalogos.LINEA_SERVICIO.map((l) => l.etiqueta);
const [encabezado, ...filas] = tablaDeEjemplo({ lineas, impuesto: null, hoy: "" }, "pdf");

const html = `<!doctype html><html lang="es"><meta charset="utf-8"><style>
  @page { size: A4 landscape; margin: 14mm 10mm; }
  body { font-family: Arial, Helvetica, sans-serif; color: ${t.texto}; font-size: 8.5pt; }
  h1 { font-size: 14pt; color: ${t.primario}; margin: 0 0 2mm; }
  p { margin: 0 0 5mm; color: ${t["texto-suave"]}; }
  table { border-collapse: collapse; width: 100%; table-layout: auto; }
  th { background: ${t.primario}; color: ${t["sobre-primario"]}; text-align: left; padding: 2mm 1.6mm; white-space: nowrap; font-size: 7.5pt; }
  td { border-bottom: 0.3mm solid ${t.borde}; padding: 1.8mm 1.6mm; vertical-align: top; text-align: left; }
  td:first-child { white-space: nowrap; font-weight: bold; }
  thead { display: table-header-group; }
</style><body>
<h1>Catálogo de servicios</h1>
<p>Ejemplo para importar en el CRM. Repite el código en otra fila para agregar un plan o un costo. Si Vigente desde está vacío, el precio rige desde el día de la importación.</p>
<table><thead><tr>${encabezado!.map((c) => `<th>${escapar(c)}</th>`).join("")}</tr></thead>
<tbody>${filas.map((f) => `<tr>${f.map((v) => `<td>${escapar(formato(v))}</td>`).join("")}</tr>`).join("")}</tbody></table>
</body></html>`;

async function generar() {
  const navegador = await chromium.launch();
  const pagina = await navegador.newPage();
  await pagina.setContent(html);
  const pdf = await pagina.pdf({ format: "A4", landscape: true, printBackground: true });
  await navegador.close();
  writeFileSync("public/plantillas/catalogo-ejemplo.pdf", pdf);
  console.log("public/plantillas/catalogo-ejemplo.pdf");
}

void generar();
