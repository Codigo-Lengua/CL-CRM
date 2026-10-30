// Completa la plantilla de parámetros en todas las organizaciones (RN-01). Es idempotente:
// solo crea lo que falta, así que se corre después de agregar una clave o un valor nuevo.
//   npm run seed
import "dotenv/config";
import { conOrganizacion, dbPlataforma } from "@/lib/db";
import { plantillaDeSector } from "@/modules/parametros/dominio/plantilla";
import { aplicarPlantilla } from "@/modules/parametros/infraestructura/prisma";

async function principal() {
  const organizaciones = await dbPlataforma().organization.findMany({
    select: { id: true, name: true, perfilOrganizacion: { select: { sector: true } } },
  });
  for (const org of organizaciones) {
    const plantilla = plantillaDeSector(org.perfilOrganizacion?.sector);
    await conOrganizacion(org.id, () => aplicarPlantilla(plantilla));
    console.log(`${org.name}: plantilla ${plantilla.nombre} al día.`);
  }
}

principal()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
