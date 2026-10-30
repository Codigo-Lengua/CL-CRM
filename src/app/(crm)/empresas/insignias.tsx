import { Insignia } from "@/components/ui";
import { type EstadoContacto, puedeContactar } from "@/modules/empresas/dominio/contactabilidad";

/** Lo que el asesor debe ver antes de escribir o llamar (RN-08, RN-09, RN-47). */
export function InsigniasEstado({ empresa }: { empresa: EstadoContacto }) {
  if (empresa.suprimidaEn) return <Insignia tono="neutro">Datos suprimidos</Insignia>;
  if (empresa.noContactar) return <Insignia tono="peligro">No contactar</Insignia>;
  return puedeContactar(empresa, "WHATSAPP").permitido ? null : (
    <Insignia tono="aviso">Sin WhatsApp</Insignia>
  );
}
