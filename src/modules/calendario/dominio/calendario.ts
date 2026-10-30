import { TZDate } from "@date-fns/tz";
import type { FechaCivil } from "./festivos-colombia";

/** 1 = lunes … 7 = domingo, como TURNO.dia_semana (CL-CRM-04). */
export type DiaSemana = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Franja de atención en hora local, por ejemplo { inicio: "08:00", fin: "17:00" }. */
export interface FranjaHoraria {
  inicio: string;
  fin: string;
}

export interface ConfiguracionCalendario {
  /** Zona horaria IANA de la organización, por ejemplo America/Bogota. */
  zonaHoraria: string;
  /** Franjas por día; un día sin franjas es inhábil. */
  horario: Partial<Record<DiaSemana, FranjaHoraria[]>>;
  /** Festivos en fecha civil local (nacionales y propios de la organización). */
  festivos: Iterable<FechaCivil>;
  /** Parámetro minutos_corte_cierre. */
  minutosCorteCierre: number;
}

interface FranjaEnMinutos {
  inicio: number;
  fin: number;
}

interface FranjaConcreta {
  inicio: Date;
  fin: Date;
}

const MS_POR_MINUTO = 60_000;
/** Límite de búsqueda de la siguiente apertura; un horario vacío nunca abre. */
const DIAS_MAXIMOS_BUSQUEDA = 400;

function aMinutos(hora: string): number {
  const coincidencia = /^(\d{2}):(\d{2})$/.exec(hora);
  if (!coincidencia) throw new Error(`Hora inválida: "${hora}". Formato esperado HH:mm.`);
  const [horas, minutos] = [Number(coincidencia[1]), Number(coincidencia[2])];
  if (horas > 24 || minutos > 59 || (horas === 24 && minutos > 0)) {
    throw new Error(`Hora fuera de rango: "${hora}".`);
  }
  return horas * 60 + minutos;
}

/**
 * Horario de atención de una organización y reloj hábil (RN-03, RN-04 y RN-05).
 *
 * Las franjas son intervalos [inicio, fin): un instante es hábil desde la
 * apertura y deja de serlo al cierre. Un vencimiento sí puede caer justo en
 * el cierre (D-19).
 */
export class Calendario {
  private readonly zonaHoraria: string;
  private readonly franjas: Map<DiaSemana, FranjaEnMinutos[]>;
  private readonly festivos: Set<FechaCivil>;
  private readonly corteMs: number;

  constructor(config: ConfiguracionCalendario) {
    this.zonaHoraria = config.zonaHoraria;
    this.festivos = new Set(config.festivos);
    if (config.minutosCorteCierre < 0) throw new Error("minutosCorteCierre no puede ser negativo.");
    this.corteMs = config.minutosCorteCierre * MS_POR_MINUTO;

    this.franjas = new Map();
    for (const [dia, franjas] of Object.entries(config.horario)) {
      const enMinutos = (franjas ?? [])
        .map((f) => ({ inicio: aMinutos(f.inicio), fin: aMinutos(f.fin) }))
        .sort((a, b) => a.inicio - b.inicio);
      enMinutos.forEach((f, i) => {
        if (f.inicio >= f.fin) throw new Error(`Franja vacía o invertida el día ${dia}.`);
        const anterior = enMinutos[i - 1];
        if (anterior && f.inicio < anterior.fin) throw new Error(`Franjas traslapadas el día ${dia}.`);
      });
      this.franjas.set(Number(dia) as DiaSemana, enMinutos);
    }
  }

  /** RN-03: dentro del horario, no festivo, en la zona horaria de la organización. */
  esHabil(instante: Date): boolean {
    return this.franjaQueContiene(instante) !== null;
  }

  /**
   * RN-04: momento desde el que corre el SLA de un lead que llega en `instante`.
   * Si es inhábil, o faltan menos minutos que el corte para cerrar la franja,
   * devuelve la siguiente apertura.
   */
  inicioEfectivo(instante: Date): Date {
    const franja = this.franjaQueContiene(instante);
    if (franja && franja.fin.getTime() - instante.getTime() >= this.corteMs) return instante;
    return this.siguienteApertura(instante);
  }

  /** RN-05: suma minutos que solo corren dentro del horario; puede cruzar días. */
  sumarMinutosHabiles(instante: Date, minutos: number): Date {
    if (minutos < 0) throw new Error("No se pueden sumar minutos negativos.");
    let restante = minutos * MS_POR_MINUTO;
    let cursor = instante;
    for (let vueltas = 0; vueltas < DIAS_MAXIMOS_BUSQUEDA * 4; vueltas++) {
      const franja = this.franjaQueContiene(cursor);
      if (!franja) {
        cursor = this.siguienteApertura(cursor);
        continue;
      }
      const disponible = franja.fin.getTime() - cursor.getTime();
      if (restante <= disponible) return new Date(cursor.getTime() + restante);
      restante -= disponible;
      cursor = franja.fin;
    }
    throw new Error("No se encontró horario suficiente para sumar los minutos.");
  }

  /** Minutos hábiles entre dos instantes; base de los indicadores del tablero. */
  minutosHabilesEntre(desde: Date, hasta: Date): number {
    if (hasta <= desde) return 0;
    let total = 0;
    let cursor = desde;
    while (cursor < hasta) {
      const franja = this.franjaQueContiene(cursor);
      if (!franja) {
        cursor = this.siguienteApertura(cursor);
        continue;
      }
      const fin = franja.fin < hasta ? franja.fin : hasta;
      total += fin.getTime() - cursor.getTime();
      cursor = fin;
    }
    return total / MS_POR_MINUTO;
  }

  /** Primera apertura de franja estrictamente posterior a `instante`. */
  siguienteApertura(instante: Date): Date {
    const local = new TZDate(instante.getTime(), this.zonaHoraria);
    for (let desfase = 0; desfase <= DIAS_MAXIMOS_BUSQUEDA; desfase++) {
      for (const franja of this.franjasDelDia(
        local.getFullYear(),
        local.getMonth(),
        local.getDate() + desfase,
      )) {
        if (franja.inicio > instante) return franja.inicio;
      }
    }
    throw new Error("El horario no tiene ninguna franja hábil.");
  }

  private franjaQueContiene(instante: Date): FranjaConcreta | null {
    const local = new TZDate(instante.getTime(), this.zonaHoraria);
    const franjas = this.franjasDelDia(local.getFullYear(), local.getMonth(), local.getDate());
    return franjas.find((f) => f.inicio <= instante && instante < f.fin) ?? null;
  }

  /** Franjas concretas de una fecha local; `dia` puede desbordar el mes. */
  private franjasDelDia(anio: number, mes: number, dia: number): FranjaConcreta[] {
    const medianoche = new TZDate(anio, mes, dia, 0, 0, this.zonaHoraria);
    const fechaCivil = [
      medianoche.getFullYear(),
      String(medianoche.getMonth() + 1).padStart(2, "0"),
      String(medianoche.getDate()).padStart(2, "0"),
    ].join("-");
    if (this.festivos.has(fechaCivil)) return [];

    const diaSemana = (((medianoche.getDay() + 6) % 7) + 1) as DiaSemana;
    const [a, m, d] = [medianoche.getFullYear(), medianoche.getMonth(), medianoche.getDate()];
    return (this.franjas.get(diaSemana) ?? []).map((f) => ({
      inicio: new Date(new TZDate(a, m, d, 0, f.inicio, this.zonaHoraria).getTime()),
      fin: new Date(new TZDate(a, m, d, 0, f.fin, this.zonaHoraria).getTime()),
    }));
  }
}
