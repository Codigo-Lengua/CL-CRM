/** Une clases ignorando las vacías. */
export function cx(...clases: (string | false | null | undefined)[]): string {
  return clases.filter(Boolean).join(" ");
}

type Opciones = Record<string, Record<string, string>>;
type Elegidas<O extends Opciones> = { [K in keyof O]?: keyof O[K] };

/**
 * Variantes tipadas: cada componente declara sus ejes (variante, tamaño…) y sus valores
 * por defecto, en lugar de acumular props booleanas sueltas.
 */
export function variantes<O extends Opciones>(
  base: string,
  opciones: O,
  porDefecto: { [K in keyof O]: keyof O[K] },
) {
  return (elegidas: Elegidas<O> = {}, extra?: string) =>
    cx(
      base,
      ...Object.keys(opciones).map((eje) => {
        const valor = (elegidas[eje] ?? porDefecto[eje]) as string;
        return opciones[eje]![valor];
      }),
      extra,
    );
}
