/**
 * Script cirurgico e idempotente para criar/garantir UMA conta de acesso.
 *
 * Diferente de `prisma/seed.ts` (que importa conteudo de marketing de pastas
 * locais), este script toca APENAS em Tenant + User — seguro para rodar contra
 * qualquer banco, inclusive producao.
 *
 * Uso (aponte para o banco alvo via DATABASE_URL):
 *   DATABASE_URL="postgresql://user:pass@host:5432/db" \
 *     npx ts-node prisma/create-user.ts
 *
 * Sobrescreva os valores padrao por env se quiser:
 *   SEED_EMAIL, SEED_PASSWORD, SEED_NAME
 *
 * A conta entra no primeiro tenant existente (para cair num workspace ja
 * populado); se nenhum existir, cria o tenant `bravy`.
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const EMAIL = process.env.SEED_EMAIL ?? 'luis@sbroggio.io';
const PASSWORD = process.env.SEED_PASSWORD ?? 'luis123';
const NAME = process.env.SEED_NAME ?? 'Luis Sbroggio';

async function main() {
  // 1. Encontra um tenant para anexar (primeiro por data de criacao) ou cria `bravy`.
  let tenant = await prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: { name: 'Bravy', slug: 'bravy' },
    });
    console.log(`Tenant criado: ${tenant.id} (${tenant.slug})`);
  } else {
    console.log(`Tenant existente: ${tenant.id} (${tenant.slug})`);
  }

  // 2. Cria ou reidrata a conta (idempotente).
  const hashed = bcrypt.hashSync(PASSWORD, 12);
  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: { password: hashed, role: 'OWNER', tenantId: tenant.id },
    create: {
      email: EMAIL,
      password: hashed,
      name: NAME,
      role: 'OWNER',
      tenantId: tenant.id,
    },
  });

  console.log(`Conta pronta: ${user.email} (role ${user.role}) no tenant ${tenant.slug}`);
  console.log(`Login: ${EMAIL} / ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error('Falha ao criar a conta:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
