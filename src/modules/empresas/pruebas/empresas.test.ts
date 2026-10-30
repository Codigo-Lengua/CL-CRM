import { describe, expect, it } from "vitest";
import { puedeContactar, type EstadoContacto } from "../dominio/contactabilidad";
import { type BuscadorDuplicados, buscarDuplicado } from "../dominio/duplicados";
import { datosSuprimidosContacto, datosSuprimidosEmpresa, enmascarar } from "../dominio/supresion";
import { normalizarTelefono } from "../dominio/telefono";

const empresa = (cambios: Partial<EstadoContacto> = {}): EstadoContacto => ({
  noContactar: false,
  aceptaWhatsapp: false,
  origenDato: "FORMULARIO",
  suprimidaEn: null,
  ...cambios,
});

function buscador(datos: {
  lugar?: Record<string, string>;
  empresa?: Record<string, string>;
  contacto?: Record<string, string>;
}): BuscadorDuplicados {
  const hallar = (mapa: Record<string, string> | undefined, claves: string[]) => {
    const clave = claves.find((c) => mapa?.[c]);
    return Promise.resolve(clave ? { empresaId: mapa![clave]!, nombre: `Empresa ${mapa![clave]}` } : null);
  };
  return {
    porGooglePlaceId: (id) => hallar(datos.lugar, [id]),
    porTelefonoEmpresa: (t) => hallar(datos.empresa, t),
    porTelefonoContacto: (t) => hallar(datos.contacto, t),
  };
}

describe("RN-07 teléfono normalizado", () => {
  it("RN-07 un celular colombiano sin indicativo queda en E.164", () => {
    expect(normalizarTelefono("300 123 4567")).toBe("+573001234567");
    expect(normalizarTelefono("(+57) 300-123-4567")).toBe("+573001234567");
    expect(normalizarTelefono("573001234567", "CO")).toBe("+573001234567");
  });

  it("RN-07 un fijo de Bogotá también se normaliza", () => {
    expect(normalizarTelefono("601 7654321")).toBe("+576017654321");
  });

  it("RN-07 un texto que no es teléfono da null", () => {
    expect(normalizarTelefono("llamar en la tarde")).toBeNull();
    expect(normalizarTelefono("")).toBeNull();
    expect(normalizarTelefono(null)).toBeNull();
  });
});

describe("RN-07 duplicados", () => {
  it("RN-07 google_place_id gana sobre el teléfono", async () => {
    const r = await buscarDuplicado(buscador({ lugar: { G1: "a" }, empresa: { "+573001234567": "b" } }), {
      googlePlaceId: "G1",
      telefonos: ["+573001234567"],
    });
    expect(r).toMatchObject({ empresaId: "a", motivo: "google_place_id" });
  });

  it("RN-07 sin lugar, busca el teléfono en empresas y luego en contactos", async () => {
    const enEmpresa = await buscarDuplicado(buscador({ empresa: { "+573001234567": "b" } }), {
      telefonos: ["+573001234567"],
    });
    expect(enEmpresa).toMatchObject({ empresaId: "b", motivo: "telefono_empresa" });

    const enContacto = await buscarDuplicado(buscador({ contacto: { "+573009999999": "c" } }), {
      googlePlaceId: "G-nuevo",
      telefonos: ["+573001234567", "+573009999999"],
    });
    expect(enContacto).toMatchObject({ empresaId: "c", motivo: "telefono_contacto" });
  });

  it("RN-07 sin coincidencias es una empresa nueva", async () => {
    await expect(buscarDuplicado(buscador({}), { telefonos: [] })).resolves.toBeNull();
    await expect(
      buscarDuplicado(buscador({}), { googlePlaceId: "X", telefonos: ["+573001234567"] }),
    ).resolves.toBeNull();
  });
});

describe("RN-08 y RN-09 contactabilidad", () => {
  it("RN-08 no contactar bloquea todos los canales", () => {
    for (const canal of ["LLAMADA", "WHATSAPP", "CORREO", "ENVIO"] as const) {
      expect(puedeContactar(empresa({ noContactar: true }), canal).permitido).toBe(false);
    }
  });

  it("RN-09 fuente pública sin aceptación no recibe WhatsApp, pero sí llamada", () => {
    const publica = empresa({ origenDato: "FUENTE_PUBLICA" });
    expect(puedeContactar(publica, "WHATSAPP").permitido).toBe(false);
    expect(puedeContactar(publica, "LLAMADA").permitido).toBe(true);
    expect(puedeContactar({ ...publica, aceptaWhatsapp: true }, "WHATSAPP").permitido).toBe(true);
  });

  it("RN-09 un prospecto del formulario sí recibe WhatsApp", () => {
    expect(puedeContactar(empresa(), "WHATSAPP").permitido).toBe(true);
  });

  it("RN-47 una empresa suprimida no se contacta", () => {
    expect(puedeContactar(empresa({ suprimidaEn: new Date() }), "CORREO").permitido).toBe(false);
  });
});

describe("RN-47 supresión de datos personales", () => {
  const ahora = new Date("2026-11-02T15:00:00Z");

  it("RN-47 borra teléfonos, correo, dirección, Instagram y textos libres de la empresa", () => {
    const datos = datosSuprimidosEmpresa(ahora);
    for (const campo of [
      "telefono",
      "telefonoE164",
      "whatsapp",
      "correo",
      "direccion",
      "instagram",
      "notas",
    ]) {
      expect(datos[campo as keyof typeof datos], campo).toBeNull();
    }
    expect(datos).toMatchObject({ noContactar: true, suprimidaEn: ahora });
    expect(datos).not.toHaveProperty("nombre");
  });

  it("RN-47 el contacto pierde nombre y datos, y conserva la fecha de autorización", () => {
    const datos = datosSuprimidosContacto(ahora);
    expect(datos).toMatchObject({ nombre: "Contacto suprimido", telefono: null, correo: null, notas: null });
    expect(datos).not.toHaveProperty("autorizacionFecha");
  });

  it("RN-47 la auditoría guarda los datos personales enmascarados", () => {
    expect(enmascarar("+573001234567")).toBe("+57•••••••567");
    expect(enmascarar("laura@spa.co")).toBe("l•••@spa.co");
    expect(enmascarar(null)).toBeNull();
  });
});
