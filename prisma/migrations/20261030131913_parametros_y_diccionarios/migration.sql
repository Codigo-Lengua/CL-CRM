-- CreateEnum
CREATE TYPE "TipoParametro" AS ENUM ('NUMERO', 'TEXTO', 'BOOLEANO', 'HORARIO', 'JSON');

-- CreateEnum
CREATE TYPE "EditablePor" AS ENUM ('ADMIN', 'PLATAFORMA');

-- CreateEnum
CREATE TYPE "TipoCatalogo" AS ENUM ('CATEGORIA_EMPRESA', 'FUENTE_LEAD', 'MOTIVO_PERDIDA', 'RESULTADO_ACTIVIDAD', 'LINEA_SERVICIO', 'MOTIVO_DEVOLUCION', 'TIPO_SOLICITUD_DATOS');

-- CreateEnum
CREATE TYPE "Canal" AS ENUM ('WHATSAPP', 'CORREO', 'ASESOR');

-- CreateTable
CREATE TABLE "configuracion" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL DEFAULT (current_setting('app.organizacion_id'::text, true))::uuid,
    "clave" TEXT NOT NULL,
    "valor" JSONB NOT NULL,
    "tipo" "TipoParametro" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "editable_por" "EditablePor" NOT NULL DEFAULT 'ADMIN',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "valor_catalogo" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL DEFAULT (current_setting('app.organizacion_id'::text, true))::uuid,
    "tipo" "TipoCatalogo" NOT NULL,
    "codigo" TEXT NOT NULL,
    "etiqueta" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "es_sistema" BOOLEAN NOT NULL DEFAULT false,
    "atributos" JSONB,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "valor_catalogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canal_envio" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL DEFAULT (current_setting('app.organizacion_id'::text, true))::uuid,
    "canal" "Canal" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "prioridad" INTEGER NOT NULL,
    "reintentos" INTEGER NOT NULL DEFAULT 0,
    "plantilla" TEXT,
    "visible_en_cotizador" BOOLEAN NOT NULL DEFAULT true,
    "actualizado_por" UUID,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canal_envio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "festivo" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL DEFAULT (current_setting('app.organizacion_id'::text, true))::uuid,
    "fecha" DATE NOT NULL,
    "nombre" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "festivo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "configuracion_organizacion_id_clave_key" ON "configuracion"("organizacion_id", "clave");

-- CreateIndex
CREATE UNIQUE INDEX "valor_catalogo_organizacion_id_tipo_codigo_key" ON "valor_catalogo"("organizacion_id", "tipo", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "valor_catalogo_organizacion_id_id_key" ON "valor_catalogo"("organizacion_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "canal_envio_organizacion_id_canal_key" ON "canal_envio"("organizacion_id", "canal");

-- CreateIndex
CREATE UNIQUE INDEX "festivo_organizacion_id_fecha_key" ON "festivo"("organizacion_id", "fecha");

-- AddForeignKey
ALTER TABLE "configuracion" ADD CONSTRAINT "configuracion_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valor_catalogo" ADD CONSTRAINT "valor_catalogo_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canal_envio" ADD CONSTRAINT "canal_envio_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "festivo" ADD CONSTRAINT "festivo_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
