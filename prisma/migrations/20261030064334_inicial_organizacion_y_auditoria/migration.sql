-- CreateTable
CREATE TABLE "organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" UUID NOT NULL,
    "organizacion_id" TEXT NOT NULL DEFAULT current_setting('app.organizacion_id', true),
    "usuario_id" TEXT,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidad_id" TEXT,
    "antes" JSONB,
    "despues" JSONB,
    "ip" TEXT,
    "ocurrido_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organization_slug_key" ON "organization"("slug");

-- CreateIndex
CREATE INDEX "auditoria_organizacion_id_entidad_entidad_id_idx" ON "auditoria"("organizacion_id", "entidad", "entidad_id");

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
