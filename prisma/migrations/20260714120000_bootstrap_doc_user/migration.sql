-- Bootstrap do login de dev do Doc (luis@sbroggio.io).
-- Roda no `prisma migrate deploy` do boot do container (mecanismo ja existente),
-- entao NAO depende de ts-node/seed. Idempotente: anexa ao primeiro tenant
-- existente (para cair num workspace ja populado) ou cria 'bravy'; faz upsert
-- do usuario OWNER. Senha 'luis123' = hash bcrypt cost 12 (credencial de teste,
-- rotacionar depois). Requer gen_random_uuid() (core no Postgres 13+).

DO $$
DECLARE
  v_tenant_id TEXT;
BEGIN
  SELECT "id" INTO v_tenant_id FROM "tenants" ORDER BY "created_at" ASC LIMIT 1;

  IF v_tenant_id IS NULL THEN
    v_tenant_id := gen_random_uuid()::text;
    INSERT INTO "tenants" ("id", "name", "slug", "timezone", "created_at", "updated_at")
    VALUES (v_tenant_id, 'Bravy', 'bravy', 'America/Sao_Paulo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
  END IF;

  INSERT INTO "users" ("id", "tenant_id", "email", "password", "name", "role", "created_at", "updated_at")
  VALUES (
    gen_random_uuid()::text,
    v_tenant_id,
    'luis@sbroggio.io',
    '$2b$12$SZP9qdQS3Oy1fZw.wElaB.wBzAI/NxN.jn1PS6HgYjX8LIm5/l6ke',
    'Luis Sbroggio',
    'OWNER',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT ("email") DO UPDATE
    SET "password" = EXCLUDED."password",
        "role" = 'OWNER',
        "updated_at" = CURRENT_TIMESTAMP;
END $$;
