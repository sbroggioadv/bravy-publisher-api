#!/usr/bin/env bash
# Garante a infra local antes do start:dev: Postgres, Redis, Docker + MinIO
# e migrations pendentes. Cada checagem é rápida quando o serviço já está de pé.
set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$BACKEND_DIR"

# Docker Desktop instala o CLI fora do PATH padrão de alguns shells
export PATH="$PATH:/usr/local/bin:/Applications/Docker.app/Contents/Resources/bin"

ok()   { printf "\033[32m✔\033[0m %s\n" "$1"; }
info() { printf "\033[36m…\033[0m %s\n" "$1"; }
fail() { printf "\033[31m✖\033[0m %s\n" "$1"; exit 1; }

# ---- Postgres (brew) --------------------------------------------------------
if pg_isready -h localhost -p 5432 -q 2>/dev/null; then
  ok "Postgres"
else
  info "Postgres parado — iniciando via brew..."
  brew services start postgresql@16 >/dev/null
  for _ in $(seq 1 15); do
    pg_isready -h localhost -p 5432 -q 2>/dev/null && break
    sleep 1
  done
  pg_isready -h localhost -p 5432 -q 2>/dev/null || fail "Postgres não subiu (brew services start postgresql@16)"
  ok "Postgres iniciado"
fi

# ---- Redis (brew) -----------------------------------------------------------
if redis-cli ping >/dev/null 2>&1; then
  ok "Redis"
else
  info "Redis parado — iniciando via brew..."
  brew services start redis >/dev/null
  for _ in $(seq 1 10); do
    redis-cli ping >/dev/null 2>&1 && break
    sleep 1
  done
  redis-cli ping >/dev/null 2>&1 || fail "Redis não subiu (brew services start redis)"
  ok "Redis iniciado"
fi

# ---- Docker Desktop + MinIO -------------------------------------------------
minio_up() { curl -sf --max-time 2 http://localhost:9000/minio/health/live >/dev/null 2>&1; }

if minio_up; then
  ok "MinIO"
else
  if ! docker info >/dev/null 2>&1; then
    info "Docker Desktop parado — iniciando (pode levar ~30s)..."
    open -a Docker
    for _ in $(seq 1 45); do
      docker info >/dev/null 2>&1 && break
      sleep 2
    done
    docker info >/dev/null 2>&1 || fail "Docker Desktop não respondeu em 90s"
  fi
  info "Subindo MinIO..."
  docker compose up -d minio >/dev/null 2>&1
  for _ in $(seq 1 15); do
    minio_up && break
    sleep 1
  done
  minio_up || fail "MinIO não respondeu no health check (docker compose logs minio)"
  ok "MinIO iniciado"
fi

# ---- Migrations pendentes ---------------------------------------------------
MIGRATE_OUT="$(npx prisma migrate deploy 2>&1)" || { echo "$MIGRATE_OUT"; fail "prisma migrate deploy falhou"; }
if grep -q "Applying" <<<"$MIGRATE_OUT"; then
  ok "Migrations aplicadas"
else
  ok "Migrations em dia"
fi

echo ""
