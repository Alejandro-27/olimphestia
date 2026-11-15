-- 0008_tenant_status.sql
-- Agregar campo status a la tabla tenants para permitir desactivar hoteles

ALTER TABLE "tenants" ADD COLUMN "status" text NOT NULL DEFAULT 'activo' CHECK ("status" IN ('activo', 'inactivo'));--> statement-breakpoint

-- Actualizar tenants existentes a activo
UPDATE "tenants" SET "status" = 'activo' WHERE "status" IS NULL;--> statement-breakpoint
