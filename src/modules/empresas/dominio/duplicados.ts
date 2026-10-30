/** Lo que identifica a una empresa que llega por cualquier canal. */
export interface Identificacion {
  googlePlaceId?: string | null;
  /** Teléfonos ya normalizados en E.164: el de la empresa, su WhatsApp y los de sus contactos. */
  telefonos: string[];
}

export interface Coincidencia {
  empresaId: string;
  nombre: string;
  motivo: "google_place_id" | "telefono_empresa" | "telefono_contacto";
}

/** Puerto de lectura: busca en la organización activa. */
export interface BuscadorDuplicados {
  porGooglePlaceId(googlePlaceId: string): Promise<Omit<Coincidencia, "motivo"> | null>;
  porTelefonoEmpresa(telefonos: string[]): Promise<Omit<Coincidencia, "motivo"> | null>;
  porTelefonoContacto(telefonos: string[]): Promise<Omit<Coincidencia, "motivo"> | null>;
}

/**
 * RN-07: primero google_place_id; luego teléfono E.164 en empresas y en contactos de la
 * misma organización. Devuelve la empresa existente o null si es nueva.
 */
export async function buscarDuplicado(
  buscador: BuscadorDuplicados,
  { googlePlaceId, telefonos }: Identificacion,
): Promise<Coincidencia | null> {
  if (googlePlaceId) {
    const porLugar = await buscador.porGooglePlaceId(googlePlaceId);
    if (porLugar) return { ...porLugar, motivo: "google_place_id" };
  }
  const unicos = [...new Set(telefonos.filter(Boolean))];
  if (unicos.length === 0) return null;
  const porEmpresa = await buscador.porTelefonoEmpresa(unicos);
  if (porEmpresa) return { ...porEmpresa, motivo: "telefono_empresa" };
  const porContacto = await buscador.porTelefonoContacto(unicos);
  return porContacto ? { ...porContacto, motivo: "telefono_contacto" } : null;
}

export const DESCRIPCION_MOTIVO: Record<Coincidencia["motivo"], string> = {
  google_place_id: "el mismo lugar de Google",
  telefono_empresa: "el mismo teléfono",
  telefono_contacto: "el teléfono de uno de sus contactos",
};
