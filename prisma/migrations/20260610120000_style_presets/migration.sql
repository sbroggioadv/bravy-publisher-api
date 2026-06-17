-- Estilos (presets): kits nomeados por tenant + estilo aplicado por post.
ALTER TABLE "brand_kits" ADD COLUMN "name" TEXT;
ALTER TABLE "brand_kits" ADD COLUMN "template" TEXT;
ALTER TABLE "contents" ADD COLUMN "style_data" JSONB;
