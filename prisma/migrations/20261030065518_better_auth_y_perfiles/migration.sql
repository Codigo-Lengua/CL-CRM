-- Las columnas de texto pasan a UUID con conversión (no se borran ni se recrean):
-- Better Auth genera UUID y el tipo debe ser el mismo en ambos lados (CL-CRM-03 §5).
-- CreateEnum
CREATE TYPE "EstadoOrganizacion" AS ENUM ('ACTIVA', 'SUSPENDIDA', 'CERRADA');

-- CreateEnum
CREATE TYPE "Disponibilidad" AS ENUM ('DISPONIBLE', 'EN_PAUSA', 'AUSENTE', 'FUERA_DE_TURNO');

-- DropForeignKey
ALTER TABLE "auditoria" DROP CONSTRAINT "auditoria_organizacion_id_fkey";

-- AlterTable
ALTER TABLE "auditoria" ALTER COLUMN "organizacion_id" DROP DEFAULT,
ALTER COLUMN "organizacion_id" SET DATA TYPE UUID USING "organizacion_id"::uuid,
ALTER COLUMN "organizacion_id" SET DEFAULT (current_setting('app.organizacion_id'::text, true))::uuid;

-- AlterTable
ALTER TABLE "organization" ALTER COLUMN "id" SET DATA TYPE UUID USING "id"::uuid,
ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
ALTER COLUMN "createdAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "user" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "twoFactorEnabled" BOOLEAN DEFAULT false,
    "role" TEXT,
    "banned" BOOLEAN DEFAULT false,
    "banReason" TEXT,
    "banExpires" TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" UUID NOT NULL,
    "activeOrganizationId" TEXT,
    "impersonatedBy" TEXT,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inviterId" UUID NOT NULL,

    CONSTRAINT "invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "twoFactor" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "secret" TEXT NOT NULL,
    "backupCodes" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "verified" BOOLEAN DEFAULT true,
    "failedVerificationCount" INTEGER DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),

    CONSTRAINT "twoFactor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfil_organizacion" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL DEFAULT (current_setting('app.organizacion_id'::text, true))::uuid,
    "nit" TEXT,
    "razon_social" TEXT,
    "sector" TEXT,
    "pais" TEXT NOT NULL DEFAULT 'CO',
    "zona_horaria" TEXT NOT NULL DEFAULT 'America/Bogota',
    "moneda" TEXT NOT NULL DEFAULT 'COP',
    "prefijo_cotizacion" TEXT,
    "plan_suscripcion" TEXT,
    "estado" "EstadoOrganizacion" NOT NULL DEFAULT 'ACTIVA',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perfil_organizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfil_comercial" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL DEFAULT (current_setting('app.organizacion_id'::text, true))::uuid,
    "miembro_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "disponibilidad" "Disponibilidad" NOT NULL DEFAULT 'FUERA_DE_TURNO',
    "disponibilidad_desde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recibe_leads" BOOLEAN NOT NULL DEFAULT false,
    "capacidad_negocios" INTEGER,
    "ultimo_lead_en" TIMESTAMP(3),
    "es_respaldo" BOOLEAN NOT NULL DEFAULT false,
    "es_guardia" BOOLEAN NOT NULL DEFAULT false,
    "telefono_corporativo" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perfil_comercial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE INDEX "member_organizationId_idx" ON "member"("organizationId");

-- CreateIndex
CREATE INDEX "member_userId_idx" ON "member"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "member_organizationId_userId_key" ON "member"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "invitation_organizationId_idx" ON "invitation"("organizationId");

-- CreateIndex
CREATE INDEX "invitation_email_idx" ON "invitation"("email");

-- CreateIndex
CREATE INDEX "twoFactor_secret_idx" ON "twoFactor"("secret");

-- CreateIndex
CREATE INDEX "twoFactor_userId_idx" ON "twoFactor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "perfil_organizacion_organizacion_id_key" ON "perfil_organizacion"("organizacion_id");

-- CreateIndex
CREATE UNIQUE INDEX "perfil_comercial_miembro_id_key" ON "perfil_comercial"("miembro_id");

-- CreateIndex
CREATE INDEX "perfil_comercial_organizacion_id_disponibilidad_idx" ON "perfil_comercial"("organizacion_id", "disponibilidad");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "twoFactor" ADD CONSTRAINT "twoFactor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfil_organizacion" ADD CONSTRAINT "perfil_organizacion_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfil_comercial" ADD CONSTRAINT "perfil_comercial_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfil_comercial" ADD CONSTRAINT "perfil_comercial_miembro_id_fkey" FOREIGN KEY ("miembro_id") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfil_comercial" ADD CONSTRAINT "perfil_comercial_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
