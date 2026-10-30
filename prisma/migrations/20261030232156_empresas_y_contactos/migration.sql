-- CreateEnum
CREATE TYPE "CanalOrigen" AS ENUM ('WEB', 'GOOGLE_PLACES', 'MANUAL', 'WHATSAPP', 'INSTAGRAM', 'MESSENGER', 'ANUNCIO');

-- CreateEnum
CREATE TYPE "OrigenDato" AS ENUM ('FORMULARIO', 'FUENTE_PUBLICA', 'REFERIDO', 'VISITA', 'IMPORTACION');

-- CreateTable
CREATE TABLE "empresa" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL DEFAULT (current_setting('app.organizacion_id'::text, true))::uuid,
    "asesor_id" UUID,
    "dueno_desde" TIMESTAMP(3),
    "nombre" TEXT NOT NULL,
    "categoria_id" UUID,
    "telefono" TEXT,
    "telefono_e164" TEXT,
    "whatsapp" TEXT,
    "correo" TEXT,
    "direccion" TEXT,
    "localidad" TEXT,
    "ciudad" TEXT,
    "sitio_web" TEXT,
    "instagram" TEXT,
    "google_place_id" TEXT,
    "calificacion_google" DECIMAL(2,1),
    "num_resenas" INTEGER,
    "fuente_id" UUID,
    "canal" "CanalOrigen" NOT NULL DEFAULT 'MANUAL',
    "campana" TEXT,
    "utm" JSONB,
    "origen_dato" "OrigenDato" NOT NULL DEFAULT 'FORMULARIO',
    "no_contactar" BOOLEAN NOT NULL DEFAULT false,
    "acepta_whatsapp" BOOLEAN NOT NULL DEFAULT false,
    "notas" TEXT,
    "suprimida_en" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacto" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL DEFAULT (current_setting('app.organizacion_id'::text, true))::uuid,
    "empresa_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "cargo" TEXT,
    "telefono" TEXT,
    "telefono_e164" TEXT,
    "correo" TEXT,
    "es_principal" BOOLEAN NOT NULL DEFAULT false,
    "autorizacion_fecha" TIMESTAMP(3),
    "autorizacion_texto" TEXT,
    "autorizacion_origen" TEXT,
    "notas" TEXT,
    "suprimido_en" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "empresa_organizacion_id_telefono_e164_idx" ON "empresa"("organizacion_id", "telefono_e164");

-- CreateIndex
CREATE INDEX "empresa_organizacion_id_asesor_id_idx" ON "empresa"("organizacion_id", "asesor_id");

-- CreateIndex
CREATE INDEX "empresa_organizacion_id_nombre_idx" ON "empresa"("organizacion_id", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "empresa_organizacion_id_id_key" ON "empresa"("organizacion_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "empresa_organizacion_id_google_place_id_key" ON "empresa"("organizacion_id", "google_place_id");

-- CreateIndex
CREATE INDEX "contacto_organizacion_id_empresa_id_idx" ON "contacto"("organizacion_id", "empresa_id");

-- CreateIndex
CREATE INDEX "contacto_organizacion_id_telefono_e164_idx" ON "contacto"("organizacion_id", "telefono_e164");

-- AddForeignKey
ALTER TABLE "empresa" ADD CONSTRAINT "empresa_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empresa" ADD CONSTRAINT "empresa_organizacion_id_categoria_id_fkey" FOREIGN KEY ("organizacion_id", "categoria_id") REFERENCES "valor_catalogo"("organizacion_id", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empresa" ADD CONSTRAINT "empresa_organizacion_id_fuente_id_fkey" FOREIGN KEY ("organizacion_id", "fuente_id") REFERENCES "valor_catalogo"("organizacion_id", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacto" ADD CONSTRAINT "contacto_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacto" ADD CONSTRAINT "contacto_organizacion_id_empresa_id_fkey" FOREIGN KEY ("organizacion_id", "empresa_id") REFERENCES "empresa"("organizacion_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
