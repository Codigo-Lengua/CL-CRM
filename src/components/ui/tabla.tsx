import { type ComponentProps } from "react";
import { cx } from "./variantes";

/** Tabla compacta para trabajo diario. Se desplaza en horizontal en pantallas pequeñas. */
export function Tabla({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="overflow-x-auto rounded-lg border border-borde">
      <table className={cx("w-full border-collapse text-sm", className)} {...props} />
    </div>
  );
}

export function Th({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      scope="col"
      className={cx(
        "border-b border-borde bg-superficie-alta px-3 py-2 text-left text-xs font-semibold tracking-wide text-texto-suave uppercase",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: ComponentProps<"td">) {
  return <td className={cx("border-b border-borde px-3 py-2 align-middle", className)} {...props} />;
}

export function Tr({ className, ...props }: ComponentProps<"tr">) {
  return <tr className={cx("hover:bg-superficie-alta/50", className)} {...props} />;
}
