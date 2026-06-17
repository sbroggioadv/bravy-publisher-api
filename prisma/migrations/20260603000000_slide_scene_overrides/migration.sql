-- Editor de cena (Sprint 2): overrides persistidos por slide + chave única
-- (contentId, position) que elimina o race do findOrCreateSlideId.

-- AlterTable: coluna esparsa de overrides do scene-engine
ALTER TABLE "slides" ADD COLUMN "scene_overrides" JSONB;

-- Dedup defensivo antes do índice único: mantém o slide mais recente por
-- (content_id, position) e remove eventuais duplicatas legadas.
DELETE FROM "slides" s
USING "slides" d
WHERE s."content_id" = d."content_id"
  AND s."position" = d."position"
  AND s."created_at" < d."created_at";

-- CreateIndex
CREATE UNIQUE INDEX "slides_content_id_position_key" ON "slides"("content_id", "position");
