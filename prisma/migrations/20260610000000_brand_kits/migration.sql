-- Brand Kit por tenant (RFC §13) + snapshot de kit no Content.

-- CreateTable
CREATE TABLE "brand_kits" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "typography" JSONB NOT NULL,
    "palette" JSONB NOT NULL,
    "brand" JSONB NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_kits_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "brand_kits" ADD CONSTRAINT "brand_kits_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: snapshot do kit aplicado ao content (não reflui silencioso, §13.2)
ALTER TABLE "contents" ADD COLUMN "brand_kit_id" TEXT;
ALTER TABLE "contents" ADD COLUMN "brand_kit_version" INTEGER;
