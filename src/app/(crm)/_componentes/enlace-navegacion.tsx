"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

export function EnlaceNavegacion({ href, children }: { href: string; children: React.ReactNode }) {
  const ruta = usePathname();
  const activo = href === "/" ? ruta === "/" : ruta.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={activo ? "page" : undefined}
      className={cx(
        "rounded-md px-3 py-2 text-sm whitespace-nowrap",
        activo
          ? "bg-superficie-alta font-medium text-texto shadow-[inset_2px_0_0_var(--color-primario)]"
          : "text-texto-suave hover:bg-superficie-alta hover:text-texto",
      )}
    >
      {children}
    </Link>
  );
}
