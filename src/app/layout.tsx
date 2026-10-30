import type { Metadata } from "next";
import { clasesFuentes } from "./fuentes";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "CRM CÓDIGO LENGUA", template: "%s · CRM" },
  description: "Prospectos, embudo, cotizaciones y reparto de leads.",
  icons: { icon: "/marca/codigo-lengua/isotipo.webp" },
};

// Aplica el modo guardado antes de pintar para que no parpadee. Texto fijo, sin datos del usuario.
const modoInicial = `try{if(localStorage.getItem("tema")==="claro")document.documentElement.dataset.tema="claro"}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${clasesFuentes} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: modoInicial }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
