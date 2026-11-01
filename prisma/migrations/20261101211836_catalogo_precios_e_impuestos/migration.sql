-- CreateEnum
CREATE TYPE "TipoServicio" AS ENUM ('PROYECTO', 'MENSUAL');

-- CreateEnum
CREATE TYPE "Periodicidad" AS ENUM ('UNICO', 'MENSUAL', 'ANUAL');

-- CreateEnum
CREATE TYPE "TipoImpuesto" AS ENUM ('TRASLADADO', 'RETENIDO');

-- CreateTable
CREATE TABLE "servicio" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL DEFAULT (current_setting('app.organizacion_id'::text, true))::uuid,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "linea_id" UUID,
    "tipo" "TipoServicio" NOT NULL,
    "incluye" TEXT,
    "entrega_dias" INTEGER,
    "horas" INTEGER,
    "visible_web" BOOLEAN NOT NULL DEFAULT true,
    "requiere_cotizacion_manual" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "servicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL DEFAULT (current_setting('app.organizacion_id'::text, true))::uuid,
    "servicio_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "limite_uso" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "precio" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL DEFAULT (current_setting('app.organizacion_id'::text, true))::uuid,
    "servicio_id" UUID,
    "plan_id" UUID,
    "valor" DECIMAL(14,2) NOT NULL,
    "vigente_desde" DATE NOT NULL,
    "vigente_hasta" DATE,
    "usuario_id" UUID,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "precio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "costo_terceros" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL DEFAULT (current_setting('app.organizacion_id'::text, true))::uuid,
    "servicio_id" UUID NOT NULL,
    "concepto" TEXT NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "periodicidad" "Periodicidad" NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "costo_terceros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "impuesto" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL DEFAULT (current_setting('app.organizacion_id'::text, true))::uuid,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoImpuesto" NOT NULL,
    "porcentaje" DECIMAL(6,3) NOT NULL,
    "incluido_en_precio" BOOLEAN NOT NULL DEFAULT false,
    "vigente_desde" DATE NOT NULL,
    "vigente_hasta" DATE,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "impuesto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicio_impuesto" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL DEFAULT (current_setting('app.organizacion_id'::text, true))::uuid,
    "servicio_id" UUID NOT NULL,
    "impuesto_id" UUID NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "servicio_impuesto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "servicio_organizacion_id_id_key" ON "servicio"("organizacion_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "servicio_organizacion_id_codigo_key" ON "servicio"("organizacion_id", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "plan_organizacion_id_id_key" ON "plan"("organizacion_id", "id");

-- CreateIndex
CREATE INDEX "precio_organizacion_id_servicio_id_vigente_desde_idx" ON "precio"("organizacion_id", "servicio_id", "vigente_desde");

-- CreateIndex
CREATE INDEX "precio_organizacion_id_plan_id_vigente_desde_idx" ON "precio"("organizacion_id", "plan_id", "vigente_desde");

-- CreateIndex
CREATE INDEX "costo_terceros_organizacion_id_servicio_id_idx" ON "costo_terceros"("organizacion_id", "servicio_id");

-- CreateIndex
CREATE UNIQUE INDEX "impuesto_organizacion_id_id_key" ON "impuesto"("organizacion_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "impuesto_organizacion_id_codigo_key" ON "impuesto"("organizacion_id", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "servicio_impuesto_organizacion_id_servicio_id_impuesto_id_key" ON "servicio_impuesto"("organizacion_id", "servicio_id", "impuesto_id");

-- AddForeignKey
ALTER TABLE "servicio" ADD CONSTRAINT "servicio_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicio" ADD CONSTRAINT "servicio_organizacion_id_linea_id_fkey" FOREIGN KEY ("organizacion_id", "linea_id") REFERENCES "valor_catalogo"("organizacion_id", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan" ADD CONSTRAINT "plan_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan" ADD CONSTRAINT "plan_organizacion_id_servicio_id_fkey" FOREIGN KEY ("organizacion_id", "servicio_id") REFERENCES "servicio"("organizacion_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "precio" ADD CONSTRAINT "precio_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "precio" ADD CONSTRAINT "precio_organizacion_id_servicio_id_fkey" FOREIGN KEY ("organizacion_id", "servicio_id") REFERENCES "servicio"("organizacion_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "precio" ADD CONSTRAINT "precio_organizacion_id_plan_id_fkey" FOREIGN KEY ("organizacion_id", "plan_id") REFERENCES "plan"("organizacion_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "costo_terceros" ADD CONSTRAINT "costo_terceros_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "costo_terceros" ADD CONSTRAINT "costo_terceros_organizacion_id_servicio_id_fkey" FOREIGN KEY ("organizacion_id", "servicio_id") REFERENCES "servicio"("organizacion_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impuesto" ADD CONSTRAINT "impuesto_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicio_impuesto" ADD CONSTRAINT "servicio_impuesto_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicio_impuesto" ADD CONSTRAINT "servicio_impuesto_organizacion_id_servicio_id_fkey" FOREIGN KEY ("organizacion_id", "servicio_id") REFERENCES "servicio"("organizacion_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicio_impuesto" ADD CONSTRAINT "servicio_impuesto_organizacion_id_impuesto_id_fkey" FOREIGN KEY ("organizacion_id", "impuesto_id") REFERENCES "impuesto"("organizacion_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RN-27 (escrito a mano): un precio es de un servicio o de un plan, nunca de ambos ni de ninguno.
ALTER TABLE "precio" ADD CONSTRAINT "precio_servicio_o_plan" CHECK (num_nonnulls("servicio_id", "plan_id") = 1);
ALTER TABLE "precio" ADD CONSTRAINT "precio_valor_no_negativo" CHECK ("valor" >= 0);
ALTER TABLE "precio" ADD CONSTRAINT "precio_vigencia_ordenada" CHECK ("vigente_hasta" IS NULL OR "vigente_hasta" >= "vigente_desde");

-- RN-27: las vigencias de un mismo servicio o plan no se traslapan. Rango cerrado: el último día cuenta.
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "precio" ADD CONSTRAINT "precio_servicio_sin_traslape" EXCLUDE USING gist (
  "organizacion_id" WITH =,
  "servicio_id" WITH =,
  daterange("vigente_desde", "vigente_hasta", '[]') WITH &&
) WHERE ("servicio_id" IS NOT NULL);
ALTER TABLE "precio" ADD CONSTRAINT "precio_plan_sin_traslape" EXCLUDE USING gist (
  "organizacion_id" WITH =,
  "plan_id" WITH =,
  daterange("vigente_desde", "vigente_hasta", '[]') WITH &&
) WHERE ("plan_id" IS NOT NULL);

ALTER TABLE "impuesto" ADD CONSTRAINT "impuesto_porcentaje_valido" CHECK ("porcentaje" >= 0 AND "porcentaje" <= 100);
ALTER TABLE "costo_terceros" ADD CONSTRAINT "costo_terceros_valor_no_negativo" CHECK ("valor" >= 0);
