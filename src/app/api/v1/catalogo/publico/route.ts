import { type NextRequest, NextResponse } from "next/server";
import { conOrganizacion, dbPlataforma } from "@/lib/db";
import { catalogoPublico } from "@/modules/catalogo/aplicacion/catalogo";

/**
 * Catálogo público para el sitio web y el cotizador (CL-CRM-02 §9): servicios visibles con su
 * precio vigente e impuestos. Nunca devuelve costos. La organización va en ?organizacion=<slug>.
 */
export async function GET(solicitud: NextRequest) {
  const slug = solicitud.nextUrl.searchParams.get("organizacion")?.trim();
  if (!slug || !/^[a-z0-9-]{2,80}$/.test(slug)) {
    return NextResponse.json({ error: "Indica la organización con ?organizacion=<slug>." }, { status: 400 });
  }
  const organizacion = await dbPlataforma().organization.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!organizacion) return NextResponse.json({ error: "Organización no encontrada." }, { status: 404 });

  const catalogo = await conOrganizacion(organizacion.id, () => catalogoPublico());
  return NextResponse.json(catalogo, {
    headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
  });
}
