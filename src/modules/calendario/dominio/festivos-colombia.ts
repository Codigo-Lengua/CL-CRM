// D-18: festivos de Colombia calculados con la Ley 51 de 1983 (Ley Emiliani)
// y la fecha de Pascua, para no cargarlos a mano cada año.

/** Fecha civil sin hora ni zona horaria, en formato YYYY-MM-DD. */
export type FechaCivil = string;

function fecha(anio: number, mes: number, dia: number): Date {
  return new Date(Date.UTC(anio, mes - 1, dia));
}

function sumarDias(base: Date, dias: number): Date {
  return new Date(base.getTime() + dias * 86_400_000);
}

function aFechaCivil(d: Date): FechaCivil {
  return d.toISOString().slice(0, 10);
}

/** Lleva la fecha al lunes siguiente si no cae en lunes (Ley Emiliani). */
function trasladarALunes(d: Date): Date {
  const dia = d.getUTCDay(); // 0 domingo … 6 sábado
  if (dia === 1) return d;
  const diasHastaLunes = (8 - dia) % 7;
  return sumarDias(d, diasHastaLunes);
}

/** Domingo de Pascua (algoritmo anónimo gregoriano de Meeus/Jones/Butcher). */
export function domingoDePascua(anio: number): Date {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return fecha(anio, mes, dia);
}

/** Los 18 festivos nacionales de Colombia de un año, ordenados. */
export function festivosColombia(anio: number): FechaCivil[] {
  const pascua = domingoDePascua(anio);

  const fijos = [
    fecha(anio, 1, 1), // Año Nuevo
    fecha(anio, 5, 1), // Día del Trabajo
    fecha(anio, 7, 20), // Independencia
    fecha(anio, 8, 7), // Batalla de Boyacá
    fecha(anio, 12, 8), // Inmaculada Concepción
    fecha(anio, 12, 25), // Navidad
  ];

  const trasladables = [
    fecha(anio, 1, 6), // Reyes Magos
    fecha(anio, 3, 19), // San José
    fecha(anio, 6, 29), // San Pedro y San Pablo
    fecha(anio, 8, 15), // Asunción de la Virgen
    fecha(anio, 10, 12), // Día de la Raza
    fecha(anio, 11, 1), // Todos los Santos
    fecha(anio, 11, 11), // Independencia de Cartagena
  ].map(trasladarALunes);

  const segunPascua = [
    sumarDias(pascua, -3), // Jueves Santo
    sumarDias(pascua, -2), // Viernes Santo
    sumarDias(pascua, 43), // Ascensión del Señor (lunes)
    sumarDias(pascua, 64), // Corpus Christi (lunes)
    sumarDias(pascua, 71), // Sagrado Corazón (lunes)
  ];

  return [...fijos, ...trasladables, ...segunPascua].map(aFechaCivil).sort();
}
