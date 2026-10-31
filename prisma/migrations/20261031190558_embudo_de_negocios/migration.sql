-- CreateEnum
CREATE TYPE "TipoEtapa" AS ENUM ('ABIERTA', 'GANADA', 'ENTREGADA', 'PERDIDA');

-- CreateTable
CREATE TABLE "etapa_embudo" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL DEFAULT (current_setting('app.organizacion_id'::text, true))::uuid,
    "codigo" TEXT,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "tipo_sistema" "TipoEtapa" NOT NULL,
    "limite_asesor" BOOLEAN NOT NULL DEFAULT false,
    "probabilidad" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "etapa_embudo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "negocio" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL DEFAULT (current_setting('app.organizacion_id'::text, true))::uuid,
    "empresa_id" UUID NOT NULL,
    "asesor_id" UUID,
    "nombre" TEXT NOT NULL,
    "etapa_id" UUID NOT NULL,
    "etapa_desde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valor_estimado" DECIMAL(14,2),
    "cierre_estimado" DATE,
    "motivo_perdida_id" UUID,
    "ganado_en" TIMESTAMP(3),
    "entregado_en" TIMESTAMP(3),
    "perdido_en" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "negocio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_etapa" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL DEFAULT (current_setting('app.organizacion_id'::text, true))::uuid,
    "negocio_id" UUID NOT NULL,
    "etapa_origen_id" UUID,
    "etapa_destino_id" UUID NOT NULL,
    "usuario_id" UUID,
    "motivo" TEXT,
    "cambiado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "historial_etapa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "etapa_embudo_organizacion_id_orden_idx" ON "etapa_embudo"("organizacion_id", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "etapa_embudo_organizacion_id_id_key" ON "etapa_embudo"("organizacion_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "etapa_embudo_organizacion_id_codigo_key" ON "etapa_embudo"("organizacion_id", "codigo");

-- CreateIndex
CREATE INDEX "negocio_organizacion_id_etapa_id_idx" ON "negocio"("organizacion_id", "etapa_id");

-- CreateIndex
CREATE INDEX "negocio_organizacion_id_empresa_id_idx" ON "negocio"("organizacion_id", "empresa_id");

-- CreateIndex
CREATE INDEX "negocio_organizacion_id_asesor_id_idx" ON "negocio"("organizacion_id", "asesor_id");

-- CreateIndex
CREATE UNIQUE INDEX "negocio_organizacion_id_id_key" ON "negocio"("organizacion_id", "id");

-- CreateIndex
CREATE INDEX "historial_etapa_organizacion_id_negocio_id_cambiado_en_idx" ON "historial_etapa"("organizacion_id", "negocio_id", "cambiado_en");

-- AddForeignKey
ALTER TABLE "etapa_embudo" ADD CONSTRAINT "etapa_embudo_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negocio" ADD CONSTRAINT "negocio_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negocio" ADD CONSTRAINT "negocio_organizacion_id_empresa_id_fkey" FOREIGN KEY ("organizacion_id", "empresa_id") REFERENCES "empresa"("organizacion_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negocio" ADD CONSTRAINT "negocio_organizacion_id_etapa_id_fkey" FOREIGN KEY ("organizacion_id", "etapa_id") REFERENCES "etapa_embudo"("organizacion_id", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negocio" ADD CONSTRAINT "negocio_organizacion_id_motivo_perdida_id_fkey" FOREIGN KEY ("organizacion_id", "motivo_perdida_id") REFERENCES "valor_catalogo"("organizacion_id", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_etapa" ADD CONSTRAINT "historial_etapa_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_etapa" ADD CONSTRAINT "historial_etapa_organizacion_id_negocio_id_fkey" FOREIGN KEY ("organizacion_id", "negocio_id") REFERENCES "negocio"("organizacion_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_etapa" ADD CONSTRAINT "historial_etapa_organizacion_id_etapa_origen_id_fkey" FOREIGN KEY ("organizacion_id", "etapa_origen_id") REFERENCES "etapa_embudo"("organizacion_id", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_etapa" ADD CONSTRAINT "historial_etapa_organizacion_id_etapa_destino_id_fkey" FOREIGN KEY ("organizacion_id", "etapa_destino_id") REFERENCES "etapa_embudo"("organizacion_id", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
