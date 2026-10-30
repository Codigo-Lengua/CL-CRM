import { Exo_2, Montserrat, Orbitron, Poppins } from "next/font/google";

// Fuentes que una organización puede elegir en su marca (FUENTES_TEXTO y FUENTES_TITULOS).
// Cada una queda en una variable CSS; <EstiloMarca> decide cuál usa --fuente-texto y --fuente-titulos.
const montserrat = Montserrat({ subsets: ["latin"], variable: "--fuente-montserrat", display: "swap" });
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--fuente-poppins",
  display: "swap",
  preload: false,
});
const orbitron = Orbitron({ subsets: ["latin"], variable: "--fuente-orbitron", display: "swap" });
const exo2 = Exo_2({ subsets: ["latin"], variable: "--fuente-exo-2", display: "swap", preload: false });

export const clasesFuentes = [montserrat, poppins, orbitron, exo2].map((f) => f.variable).join(" ");
