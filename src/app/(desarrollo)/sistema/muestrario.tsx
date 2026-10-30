"use client";

import { useState } from "react";
import { variablesDeModo } from "@/components/marca/variables";
import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  Dialogo,
  EncabezadoPagina,
  EstadoVacio,
  Insignia,
  Pestanas,
  ProveedorToasts,
  Selector,
  SinPermiso,
  Tabla,
  Tarjeta,
  Td,
  Th,
  Tr,
  useToast,
} from "@/components/ui";
import { MARCA_CODIGO_LENGUA } from "@/modules/marca/dominio/marca";

function Componentes() {
  const [dialogo, setDialogo] = useState(false);
  const [pestana, setPestana] = useState<"uno" | "dos">("uno");
  const toast = useToast();

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Empresas"
        detalle="Encabezado de página con acciones."
        acciones={<Boton>Nueva empresa</Boton>}
      />
      <Tarjeta className="flex flex-wrap items-center gap-2">
        <Boton>Primario</Boton>
        <Boton variante="secundario">Secundario</Boton>
        <Boton variante="fantasma">Fantasma</Boton>
        <Boton variante="peligro">Eliminar</Boton>
        <Boton cargando>Guardando</Boton>
        <Boton tamano="sm" disabled>
          Deshabilitado
        </Boton>
      </Tarjeta>
      <Tarjeta className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Nombre comercial" placeholder="Spa Aurora" ayuda="Como aparece en la cotización." />
        <Campo
          etiqueta="NIT"
          defaultValue="900-123"
          error="El NIT debe tener 9 dígitos y el de verificación."
        />
        <Selector etiqueta="Categoría" defaultValue="SPA">
          <option value="SPA">Spa</option>
          <option value="ESTETICA">Estética</option>
        </Selector>
      </Tarjeta>
      <div className="flex flex-wrap gap-2">
        <Insignia>Neutro</Insignia>
        <Insignia tono="primario">Nuevo</Insignia>
        <Insignia tono="exito">Ganado</Insignia>
        <Insignia tono="peligro">Vencido</Insignia>
        <Insignia tono="aviso">En pausa</Insignia>
      </div>
      <Aviso tono="error">No se pudo guardar: revisa el NIT.</Aviso>
      <Aviso tono="ok">Empresa guardada.</Aviso>
      <Aviso tono="aviso">Este lead lleva 8 minutos sin contacto.</Aviso>
      <Tabla>
        <thead>
          <tr>
            <Th>Empresa</Th>
            <Th>Asesor</Th>
            <Th className="text-right">Valor</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>Spa Aurora</Td>
            <Td>Laura</Td>
            <Td className="text-right tabular-nums">$ 2.400.000</Td>
          </Tr>
          <Tr>
            <Td>Estética Lumen</Td>
            <Td>Natalia</Td>
            <Td className="text-right tabular-nums">$ 1.150.000</Td>
          </Tr>
        </tbody>
      </Tabla>
      <Pestanas
        opciones={[
          { id: "uno", nombre: "Actividades" },
          { id: "dos", nombre: "Cotizaciones" },
        ]}
        activa={pestana}
        onCambiar={setPestana}
      >
        <p className="text-sm">Contenido de {pestana === "uno" ? "actividades" : "cotizaciones"}.</p>
      </Pestanas>
      <EstadoVacio
        titulo="Aún no hay empresas"
        detalle="Importa los prospectos o crea la primera."
        accion={<Boton tamano="sm">Crear empresa</Boton>}
      />
      <Cargando />
      <SinPermiso texto="Solo un administrador puede ver esta sección." />
      <div className="flex gap-2">
        <Boton variante="secundario" onClick={() => setDialogo(true)}>
          Abrir diálogo
        </Boton>
        <Boton variante="secundario" onClick={() => toast("ok", "Cambios guardados.")}>
          Mostrar toast
        </Boton>
      </div>
      <Dialogo
        abierto={dialogo}
        onCerrar={() => setDialogo(false)}
        titulo="¿Marcar como perdido?"
        acciones={
          <Boton variante="peligro" onClick={() => setDialogo(false)}>
            Marcar perdido
          </Boton>
        }
      >
        El negocio sale del embudo y se guarda el motivo.
      </Dialogo>
    </div>
  );
}

export function Muestrario() {
  return (
    <ProveedorToasts>
      <main className="grid gap-0 lg:grid-cols-2">
        {(["oscuro", "claro"] as const).map((modo) => (
          <section
            key={modo}
            aria-label={`Modo ${modo}`}
            style={variablesDeModo(MARCA_CODIGO_LENGUA, modo)}
            className="bg-fondo p-6 font-sans text-texto"
          >
            <Componentes />
          </section>
        ))}
      </main>
    </ProveedorToasts>
  );
}
