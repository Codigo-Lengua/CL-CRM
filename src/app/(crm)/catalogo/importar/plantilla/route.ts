import { conPermiso } from "@/lib/auth/sesion";
import { db } from "@/lib/db";
import { ErrorSinPermiso } from "@/lib/permisos";
import { plantillaCsv, plantillaExcel } from "@/modules/catalogo/infraestructura/archivos/plantilla";
import { hoyEnOrganizacion } from "@/modules/catalogo/infraestructura/prisma";
import { derivarTokens } from "@/modules/marca/dominio/tokens";
import { leerMarca } from "@/modules/marca/infraestructura/prisma";

/** Plantilla con las líneas y un impuesto de la organización: el ejemplo se importa tal cual. */
async function parametros() {
  const [lineas, impuesto, hoy] = await Promise.all([
    db().valorCatalogo.findMany({
      where: { tipo: "LINEA_SERVICIO", activo: true },
      orderBy: { orden: "asc" },
      select: { etiqueta: true },
    }),
    db().impuesto.findFirst({ where: { activo: true, tipo: "TRASLADADO" }, orderBy: { codigo: "asc" } }),
    hoyEnOrganizacion(),
  ]);
  return { lineas: lineas.map((l) => l.etiqueta), impuesto: impuesto?.codigo ?? null, hoy };
}

export async function GET(request: Request) {
  const formato = new URL(request.url).searchParams.get("formato");
  try {
    return await conPermiso("configuracion.administrar", async () => {
      const datos = await parametros();
      if (formato === "csv") {
        return new Response(plantillaCsv(datos), {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": 'attachment; filename="plantilla-catalogo.csv"',
          },
        });
      }
      // Modo claro: es como se ve una hoja de cálculo.
      const tokens = derivarTokens((await leerMarca()).colores, "claro");
      const colores = { fondo: tokens.primario, texto: tokens["sobre-primario"] };
      return new Response(new Uint8Array(await plantillaExcel(datos, colores)), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": 'attachment; filename="plantilla-catalogo.xlsx"',
        },
      });
    });
  } catch (error) {
    if (error instanceof ErrorSinPermiso) return new Response("Solo un administrador.", { status: 403 });
    throw error;
  }
}
