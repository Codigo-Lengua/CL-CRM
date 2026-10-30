import { organizacionActual } from "@/lib/db/contexto";
import {
  type ClaveParametro,
  DEFINICIONES,
  validarParametro,
  type ValorParametro,
} from "../dominio/definiciones";

/** Lee las filas de CONFIGURACION de la organización activa (puerto hacia la base de datos). */
export type CargarConfiguracion = () => Promise<ReadonlyArray<{ clave: string; valor: unknown }>>;

interface Entrada {
  valores: ReadonlyMap<string, unknown>;
  venceEn: number;
}

/** Red de seguridad si otra instancia guardó un cambio; en la misma instancia se invalida al guardar. */
const VIGENCIA_CACHE_MS = 5 * 60_000;

/**
 * RN-01: toda regla lee sus valores con `obtener`. Primero la organización activa y, si no
 * tiene la clave o el valor guardado no es válido, el valor por defecto de la plantilla;
 * nunca una constante en el código de la regla.
 *
 * Los valores se cachean por organización y la caché se invalida al guardar un cambio.
 */
export class Parametros {
  private readonly cache = new Map<string, Entrada>();
  private readonly cargando = new Map<string, Promise<Entrada>>();

  constructor(
    private readonly cargar: CargarConfiguracion,
    private readonly ahora: () => number = Date.now,
  ) {}

  async obtener<K extends ClaveParametro>(clave: K): Promise<ValorParametro<K>> {
    const { valores } = await this.entrada();
    if (valores.has(clave)) {
      const validado = validarParametro(clave, valores.get(clave));
      if (validado.ok) return validado.valor;
    }
    return DEFINICIONES[clave].porDefecto as ValorParametro<K>;
  }

  /** Varias claves a la vez, con una sola lectura de la base de datos. */
  async obtenerVarios<K extends ClaveParametro>(
    claves: readonly K[],
  ): Promise<{ [C in K]: ValorParametro<C> }> {
    const pares = await Promise.all(claves.map(async (clave) => [clave, await this.obtener(clave)] as const));
    return Object.fromEntries(pares) as { [C in K]: ValorParametro<C> };
  }

  /** Se llama después de guardar cualquier parámetro de la organización. */
  invalidar(organizacionId: string): void {
    this.cache.delete(organizacionId);
    this.cargando.delete(organizacionId);
  }

  private async entrada(): Promise<Entrada> {
    const organizacionId = organizacionActual();
    if (!organizacionId) throw new Error("RN-02: Parametros.obtener requiere una organización activa.");

    const guardada = this.cache.get(organizacionId);
    if (guardada && guardada.venceEn > this.ahora()) return guardada;

    // Evita que varias lecturas simultáneas consulten la base de datos a la vez.
    let pendiente = this.cargando.get(organizacionId);
    if (!pendiente) {
      pendiente = this.cargar().then((filas) => ({
        valores: new Map(filas.map((f) => [f.clave, f.valor])),
        venceEn: this.ahora() + VIGENCIA_CACHE_MS,
      }));
      this.cargando.set(organizacionId, pendiente);
    }
    try {
      const entrada = await pendiente;
      if (this.cargando.get(organizacionId) === pendiente) this.cache.set(organizacionId, entrada);
      return entrada;
    } finally {
      if (this.cargando.get(organizacionId) === pendiente) this.cargando.delete(organizacionId);
    }
  }
}
