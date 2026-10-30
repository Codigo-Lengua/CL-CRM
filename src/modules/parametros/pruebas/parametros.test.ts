import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { conOrganizacion } from "@/lib/db/contexto";
import { Parametros } from "../aplicacion/parametros";
import { CLAVES, DEFINICIONES, validarParametro } from "../dominio/definiciones";
import { NOMBRE_CATALOGO, PLANTILLA_CODIGO_LENGUA, plantillaDeSector } from "../dominio/plantilla";

const org = randomUUID();

function servicio(filas: { clave: string; valor: unknown }[]) {
  const cargar = vi.fn(() => Promise.resolve(filas));
  let reloj = 0;
  const parametros = new Parametros(cargar, () => reloj);
  return { parametros, cargar, avanzar: (ms: number) => (reloj += ms) };
}

describe("RN-01 Parametros.obtener", () => {
  it("RN-01 usa el valor guardado de la organización", async () => {
    const { parametros } = servicio([{ clave: "minutos_sla_primer_contacto", valor: 25 }]);
    await expect(conOrganizacion(org, () => parametros.obtener("minutos_sla_primer_contacto"))).resolves.toBe(
      25,
    );
  });

  it("RN-01 sin valor guardado usa el de la plantilla", async () => {
    const { parametros } = servicio([]);
    await expect(conOrganizacion(org, () => parametros.obtener("vigencia_cotizacion_dias"))).resolves.toBe(
      15,
    );
    await expect(conOrganizacion(org, () => parametros.obtener("dias_seguimiento_cliente"))).resolves.toEqual(
      [2, 5, 10],
    );
  });

  it("RN-01 un valor guardado inválido no rompe la regla: usa el de la plantilla", async () => {
    const { parametros } = servicio([{ clave: "dia_liquidacion", valor: "quinto" }]);
    await expect(conOrganizacion(org, () => parametros.obtener("dia_liquidacion"))).resolves.toBe(5);
  });

  it("RN-01 sin organización activa falla (RN-02)", async () => {
    const { parametros } = servicio([]);
    await expect(parametros.obtener("dia_liquidacion")).rejects.toThrow("RN-02");
  });

  it("RN-01 consulta la base de datos una vez por organización mientras la caché sigue vigente", async () => {
    const { parametros, cargar } = servicio([]);
    await conOrganizacion(org, () =>
      Promise.all([parametros.obtener("dia_liquidacion"), parametros.obtener("niveles_escalamiento")]),
    );
    await conOrganizacion(org, () => parametros.obtener("minutos_alerta_pausa"));
    expect(cargar).toHaveBeenCalledTimes(1);

    await conOrganizacion(randomUUID(), () => parametros.obtener("dia_liquidacion"));
    expect(cargar).toHaveBeenCalledTimes(2);
  });

  it("RN-01 al guardar un cambio se invalida la caché de esa organización", async () => {
    const filas = [{ clave: "niveles_escalamiento", valor: 3 as unknown }];
    const { parametros, cargar } = servicio(filas);
    await conOrganizacion(org, () => parametros.obtener("niveles_escalamiento"));
    filas[0]!.valor = 5;
    parametros.invalidar(org);
    await expect(conOrganizacion(org, () => parametros.obtener("niveles_escalamiento"))).resolves.toBe(5);
    expect(cargar).toHaveBeenCalledTimes(2);
  });

  it("RN-01 la caché caduca sola para recoger cambios de otra instancia", async () => {
    const { parametros, cargar, avanzar } = servicio([]);
    await conOrganizacion(org, () => parametros.obtener("dia_liquidacion"));
    avanzar(5 * 60_000 + 1);
    await conOrganizacion(org, () => parametros.obtener("dia_liquidacion"));
    expect(cargar).toHaveBeenCalledTimes(2);
  });
});

describe("RN-01 validación de parámetros", () => {
  it("RN-01 los valores por defecto cumplen su propia validación", () => {
    for (const clave of CLAVES) {
      expect(validarParametro(clave, DEFINICIONES[clave].porDefecto).ok, clave).toBe(true);
    }
  });

  it("RN-01 el horario rechaza un cierre antes de la apertura", () => {
    expect(validarParametro("horario_atencion", { 1: [{ inicio: "17:00", fin: "08:00" }] }).ok).toBe(false);
    expect(validarParametro("horario_atencion", { 8: [{ inicio: "08:00", fin: "17:00" }] }).ok).toBe(false);
    expect(validarParametro("horario_atencion", { 7: [{ inicio: "09:00", fin: "12:00" }] }).ok).toBe(true);
  });

  it("RN-01 los días de seguimiento van en orden creciente", () => {
    expect(validarParametro("dias_seguimiento_cliente", [5, 2]).ok).toBe(false);
    expect(validarParametro("dias_seguimiento_cliente", [1, 3, 7]).ok).toBe(true);
  });

  it("RN-01 los números se limitan a su rango", () => {
    expect(validarParametro("dia_liquidacion", 31)).toEqual({ ok: false, error: "El máximo es 28." });
    expect(validarParametro("minutos_sla_primer_contacto", 0).ok).toBe(false);
    expect(validarParametro("minutos_sla_primer_contacto", 2.5).ok).toBe(false);
  });
});

describe("RN-01 plantilla de CÓDIGO LENGUA", () => {
  it("RN-01 trae todas las claves y todos los diccionarios", () => {
    expect(Object.keys(PLANTILLA_CODIGO_LENGUA.configuracion).sort()).toEqual([...CLAVES].sort());
    for (const tipo of Object.keys(NOMBRE_CATALOGO)) {
      expect(
        PLANTILLA_CODIGO_LENGUA.catalogos[tipo as keyof typeof NOMBRE_CATALOGO].length,
        tipo,
      ).toBeGreaterThan(0);
    }
  });

  it("RN-01 los códigos son únicos por diccionario y en mayúsculas", () => {
    for (const [tipo, valores] of Object.entries(PLANTILLA_CODIGO_LENGUA.catalogos)) {
      const codigos = valores.map((v) => v.codigo);
      expect(new Set(codigos).size, tipo).toBe(codigos.length);
      for (const codigo of codigos) expect(codigo).toMatch(/^[A-Z0-9_]+$/);
    }
  });

  it("RN-01 trae las categorías SPA, ESTETICA, MASAJES y OTRO", () => {
    expect(PLANTILLA_CODIGO_LENGUA.catalogos.CATEGORIA_EMPRESA.map((v) => v.codigo)).toEqual([
      "SPA",
      "ESTETICA",
      "MASAJES",
      "OTRO",
    ]);
  });

  it("RN-01 los resultados de actividad dicen si el contacto fue efectivo", () => {
    for (const v of PLANTILLA_CODIGO_LENGUA.catalogos.RESULTADO_ACTIVIDAD) {
      expect(typeof v.atributos?.contacto_efectivo, v.codigo).toBe("boolean");
    }
  });

  it("RN-01 un sector sin plantilla propia recibe la general", () => {
    expect(plantillaDeSector("salud")).toBe(PLANTILLA_CODIGO_LENGUA);
    expect(plantillaDeSector(null)).toBe(PLANTILLA_CODIGO_LENGUA);
  });
});
