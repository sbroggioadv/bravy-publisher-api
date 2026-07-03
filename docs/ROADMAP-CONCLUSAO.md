# Publisher — Roadmap de Conclusão

**Data:** 2026-07-03 · **Autor:** CTO review (auditoria completa backend + frontend + scene-engine)
**Repos:** `asv-digital/bravy-Publisher-api` · `asv-digital/bravy-publisher-web` (main, sync com GitHub)

---

## 1. Sumário executivo

O core do produto está **pronto em código, mas não validado em runtime**. Wizard → estúdio Konva →
export → publicação no Instagram existe de ponta a ponta e compila limpo; os bugs críticos de junho
foram todos corrigidos. O que falta para declarar o sistema concluído se divide em 4 blocos:

| Bloco | Esforço | Risco | Bloqueia produção? |
|---|---|---|---|
| F0 — Validação E2E do que já existe | 1–2 dias | Baixo | **Sim** |
| F1 — Higiene técnica pré-deploy | 0,5–1 dia | Baixo | **Sim** |
| F2 — Deploy em produção | 1–2 dias | Médio | — |
| F3 — Features aprovadas (RAG, Brand Book, Analytics) | 10–15 dias | Médio | Não (pós-launch) |
| F4 — Decisões de escopo (Sprint 4/5, agents, REEL/STATIC) | decisão | — | Não |

**Regra de ouro:** F0 antes de tudo. Todo o ciclo de 17/jun (publish dialog, OAuth, designer de
templates, wizard schedule) compila mas **nunca rodou no app de verdade**. Validar antes de construir
por cima — é o passo mais barato e o que mais reduz risco.

**Dependência externa a disparar HOJE:** App Review da Meta para o scope
`instagram_manage_insights` (pré-requisito do Analytics, F3.3). O review leva semanas e não depende
de código nosso — quanto antes entrar na fila, melhor.

---

## 2. Estado atual (auditado em 2026-07-03)

### Pronto e verificado no código

- **Engine Konva** (`packages/scene-engine`, vendorado nos 2 repos): 49/49 testes verdes.
  Templates: `step`, `compendium`, `tweet` + `layoutTemplate` (custom free-form).
- **Estúdio**: edição de texto in-place, elementos livres (texto/formas/imagem), grupos, rotação,
  alinhamento/distribuição, inspector completo (cor livre, px, peso, fonte Google, opacidade),
  undo/redo, export PNG → MinIO. É o editor default em `/content/[id]` (`?legacy=1` = antigo).
- **Publicação E2E (código)**: `SchedulesService` → `publish-cron` (enfileira via `addBulk`) →
  `PublishingProcessor` → `InstagramClient.publishCarousel` (containers → carousel → publish),
  com progresso persistido e exibido no `PublishDialog`. LinkedIn adapter funcional (carousel/static).
- **OAuth Instagram**: start/callback/refresh/diagnose completos; token refresh via cron diário;
  tokens criptografados (AES-256-GCM, `EncryptionService`).
- **Templates**: galeria (sistema + custom), designer free-form (`/templates/new`, `/templates/[id]`),
  duplicar-e-customizar. CRUD tenant-scoped real.
- **Brand Kit**: CRUD versionado, editor em `/settings/marca`, Google Fonts (catálogo + cache MinIO),
  estilos nomeados.
- **Bugs de jun/2026**: todos corrigidos (tenantId via `@CurrentUser`, encryption em uso,
  cron enfileirando, `fetchInstagramProfile` definido, tsc backend limpo).

### Não existe (0%)

- **RAG / Base de Conhecimento** — sem módulo, sem pgvector, sem `/settings/conhecimento`.
- **Brand Book real** — logo ainda é o glifo `✻`; voz da marca não entra no prompt; sem extração por IA.
- **Analytics real** — a tabela `Analytics` nunca é populada (nenhum cron de insights);
  `/analytics` chama a API real e volta vazio. Sem campos `reposts`/`permalink`.
- **Sistema de agents** (arquitetura ref. bullq) — não iniciado.

### Fatos operacionais

- Nenhum código de produto mudou entre 17/jun e 2/jul — o trabalho de 1–2/jul foi git init + push +
  vendoring do scene-engine + builds.
- `~/www/publisher` raiz **não** é repo git; backend e frontend são repos independentes.
- Plano detalhado das 3 features: `~/.claude/plans/precisamos-add-2-features-synthetic-boole.md`.

---

## 3. F0 — Validação E2E (1–2 dias) 🔴 prioridade máxima

**Objetivo:** provar em runtime tudo que hoje só existe como "compila limpo".

Subir o stack completo (`docker-compose` + backend + worker + frontend) e percorrer:

- [ ] **Auth + onboarding**: login, tenant, seed do brand kit default.
- [ ] **OAuth Instagram real**: conectar conta Business em `/settings/canais` → avatar/nome aparecem →
      token gravado criptografado → `GET /oauth/instagram/diagnose` ok.
- [ ] **Geração**: wizard persona → pattern → theme (testar os 4 cards: Automático, Editorial,
      Twitter, Terminal + um template custom) → gerar → estúdio abre com o conteúdo.
- [ ] **Estúdio**: editar texto in-place, inserir elemento livre, agrupar, trocar fonte/cor,
      undo/redo, reload da página preserva tudo (overrides + added persistidos).
- [ ] **Regenerate slide** com hint → só o slide regenerado perde overrides.
- [ ] **Export + publicação imediata**: Aprovar → PNGs no MinIO → `PublishDialog` → publicar agora →
      **post real no Instagram** → progresso chega a 100% → `Content.status=PUBLISHED`.
- [ ] **Agendamento**: agendar pra +5min → cron pega → publica sozinho → status COMPLETED.
- [ ] **Templates custom**: criar no designer → usar no wizard → gerar → slots preenchidos
      corretamente (validar o fix "tudo vazio" do `layout.ts`).
- [ ] **LinkedIn** (se houver conta de teste): publicar carousel.

**Gate de saída:** 1 post real publicado via fluxo completo + 1 post agendado publicado pelo cron,
sem intervenção manual no banco.

**Bugs encontrados aqui têm prioridade sobre qualquer feature nova.**

---

## 4. F1 — Higiene técnica pré-deploy (0,5–1 dia) 🔴

Pequenos itens que vão morder em produção. Fazer junto com F0 (mesma sessão de trabalho).

- [ ] **tsc do frontend**: excluir `packages/scene-engine` node-only do `tsconfig.json`
      (5 erros de `skia-canvas`/`pngjs`; o `src/` está limpo). Adicionar script `typecheck` no
      `package.json` dos 2 repos e travar como gate de commit.
- [ ] **Datasets de geração**: `backend/datasets/` está **vazio** — a geração roda hoje sem
      `padroes_validados.json`/`top_carrosseis.json`/`vocab.json` (fallback silencioso `[]`).
      Popular a pasta no repo ou definir `DATASET_DIR` no ambiente. Decidir se datasets são
      versionados ou asset de deploy. O `prisma/seed.ts` ainda aponta path absoluto
      (`~/codigos/marketing/...`) — aceitável como script dev-only, documentar.
- [ ] **ContentType mismatch**: frontend usa `'POST'`, Prisma tem `CAROUSEL|REEL|STATIC`.
      Alinhar `src/types/content.ts` + `constants.ts` com o enum do Prisma.
- [ ] **Dead code**: remover `StylesPanel.tsx` (não importado), `MOCK_ACCOUNTS` do
      `step-schedule.tsx`, flag `NEXT_PUBLIC_STUDIO_KONVA` do `.env.local` (ninguém lê).
- [ ] **Unificar publish**: `StepSchedule` duplica a lógica do `PublishDialog` — extrair hook
      compartilhado (`usePublishContent`) pra não divergirem.
- [ ] **Tokens legados**: `EncryptionService.decrypt` tem fallback pra rows em texto plano.
      Verificar se existem rows legadas no banco; se sim, migrar (re-encrypt) e depois remover o
      fallback — em produção ele mascara corrupção de dado.

**Gate de saída:** `tsc --noEmit` verde nos 2 repos + `pnpm test` verde no engine + zero fallbacks
silenciosos conhecidos.

---

## 5. F2 — Deploy em produção (1–2 dias) 🟠

- [ ] **Infra**: provisionar Postgres (usar já `pgvector/pgvector:pg16` — evita migração de imagem
      quando o RAG chegar), Redis, MinIO (ou R2/S3 compatível), com backups do Postgres.
- [ ] **Processos**: API + worker como processos separados (o worker consome as filas BullMQ;
      sem ele, agendamento não publica). Health checks nos dois.
- [ ] **Envs críticos**: `ENCRYPTION_KEY` (base64 32 bytes — obrigatória em prod), `JWT_SECRET`,
      credenciais Meta (app + redirect URI de produção no painel da Meta), `DATASET_DIR`,
      `ANTHROPIC_API_KEY`, MinIO/S3.
- [ ] **OAuth em prod**: registrar o callback de produção no app da Meta; validar o fluxo com
      domínio real (o redirect pro SPA é hardcoded? conferir `FRONTEND_URL`).
- [ ] **Build nativo**: `skia-canvas` e `bcrypt` compilam no target de deploy (já autorizado no
      pnpm — commit `a00567f`); validar na imagem/máquina de produção.
- [ ] **CI mínimo**: GitHub Actions nos 2 repos — install + typecheck + testes (engine) + build.
      Deploy automático (Coolify, padrão da casa) na sequência.
- [ ] **Smoke pós-deploy**: repetir o gate de F0 em produção (1 post real + 1 agendado).

**Gate de saída:** sistema publicando em produção com deploy reproduzível via push na main.

---

## 6. F3 — Features aprovadas (10–15 dias) 🟡

Plano detalhado e aprovado em `~/.claude/plans/precisamos-add-2-features-synthetic-boole.md`.
As 3 são independentes e backend-first. Ordem recomendada abaixo (Analytics por último porque
depende do App Review da Meta — que deve ser **disparado no dia 1**).

### F3.0 — Disparar App Review da Meta (hoje, 1h)
- [ ] Solicitar `instagram_manage_insights` no App Review (conta Business/Creator, screencast do
      caso de uso). **Caminho crítico do Analytics — não depende de código.**

### F3.1 — RAG / Base de Conhecimento (4–5 dias)
Upload `.md/.pdf/.csv/.png/.jpg` → MinIO → fila `knowledge-ingest` → parse → chunk (~400 tokens,
15% overlap) → embeddings OpenAI `text-embedding-3-small` (1536 dims) → pgvector → retrieval
injetado no `userPrompt` do `generate()` (parte não-cacheada — preserva o prompt cache).

- [ ] Infra: imagem pgvector no compose + migration raw (`CREATE EXTENSION vector`, coluna
      `embedding vector(1536)`, índice HNSW). Envs: `OPENAI_API_KEY`, limites de KB.
- [ ] Módulo `backend/src/modules/knowledge/` (controller, service, processor, retrieval,
      parsers `unpdf`/`papaparse`, caption de imagem via Haiku vision). Registrar fila no
      `app.module` **e** `worker.module`.
- [ ] Retrieval no `generate()`: short-circuit pra tenant sem KB; bloco
      `=== BASE DE CONHECIMENTO ===` que destrava a guardrail anti-invenção pra fatos da base.
- [ ] Frontend: aba `/settings/conhecimento` (uploader drag-and-drop, lista com status + polling,
      delete/reprocess).
- **Gate:** subir docs reais da Bravy → gerar carrossel sobre tema coberto → slides citam os fatos
  reais; tenant sem KB gera prompt idêntico ao atual (zero custo extra).

### F3.2 — Brand Book visual + voz (3–4 dias)
- [ ] Migration `BrandKit`: logo (light/dark, key/url/aspect), `brandColors`, `customFonts`, `voice`.
- [ ] Upload de logo (sanitizar SVG + rasterizar PNG 512px — Skia não desenha SVG) + derivar paleta
      (`paletteFromBrandColors` → 16 tokens com guard de contraste WCAG).
- [ ] scene-engine: `tokens.logo` + `pushLogo()` substituindo o glifo `✻` em step/compendium/tweet
      (fallback ao glifo). **Atenção:** o render server (`node/render.ts`) precisa de `resolveImage`
      — hoje image nodes viram caixa cinza no Skia.
- [ ] Upload de fonte própria (`.ttf/.otf`, parse via fontkit, licenseAck) + registro dual
      browser/node.
- [ ] Voz da marca: campo `voice` → seção `=== VOZ DA MARCA ===` no system prompt (só tom; fatos
      vêm do RAG).
- [ ] "Importar do brand book": PDF/imagem → Claude vision → sugestão de cores/fontes/voz
      (suggestion-only, nada salvo sem confirmação).
- **Gate:** gerar post novo → logo real (não asterisco) + paleta + fonte da marca no preview E no
  PNG exportado; `voice` definida muda o tom do texto gerado.

### F3.3 — Analytics estratégico (3–4 dias, gated pelo App Review)
- [ ] Migration: `Analytics.reposts`, `PublishTarget.permalink`.
- [ ] `fetchInsights` no `InstagramClient` (permalink, like_count, comments_count + insights
      reach/saved/shares/views) + scope novo em `REQUIRED_SCOPES` → **usuário reconecta a conta**.
- [ ] Módulo `metrics/`: cron horário → fila `metrics` → processor (concurrency 1, janela
      `METRICS_WINDOW_DAYS`, snapshot novo por fetch — ranking usa sempre o mais recente,
      nunca soma). Registrar no app E worker module.
- [ ] `ranking()` enriquecido: sortBy (likes/comments/shares/saves/reposts/...), thumbnail do cover,
      permalink, envelope paginado.
- [ ] Frontend: metric switcher (tabs), linha com preview + link pro post, estados vazios
      ("sem posts" vs "coletando métricas"). Corrigir `analytics-api.ts` (`/analytics/dashboard`).
- [ ] Endpoint admin `POST /analytics/metrics/refresh` pra backfill/teste.
- **Gate:** post publicado real → snapshot com números reais + permalink → `/analytics` alterna as
  5 tabs com preview e link abrindo o post no Instagram.

---

## 7. F4 — Decisões de escopo (aguardando JP) ⚪

Nenhuma bloqueia o launch. Decidir depois de F0–F2 no ar:

1. **Sprint 4 da RFC (render server-side, SSE, mobile, matar Playwright).** Com o export
   client-side alimentando o publish, o render server só é necessário pra fluxos 100% automáticos
   (publicar sem abrir o estúdio) — e o Brand Book (F3.2) já exige consertar o `resolveImage` do
   Skia. **Recomendação:** re-escopar para "paridade server mínima pro render de publicação
   automática" e matar o Playwright nessa mesma tacada; mobile/SSE só se houver demanda real.

   > **EXECUTADO em 2026-07-03 — decisão do JP: remoção COMPLETA, sem substituto server-side.**
   > Removidos: dep `playwright`, `render.service/processor/controller/module`, `template-engine.ts`
   > + `template-engine.css.ts` (950 linhas), endpoints `/render/*`, fila `render`, botão
   > "Renderizar PNGs" do editor legado, `render-api.ts`, tipo `RenderJob` e mocks no frontend.
   > `Dockerfile.worker` trocou a imagem base Playwright por `node:22-bookworm-slim`.
   > **Consequência de produto:** toda imagem de slide vem do export client-side do estúdio —
   > não existe mais render server-side (publicação automática exige abrir o estúdio antes).
   > **Preservados** (WIP paralelo do Sprint 5 em andamento): `carousel-to-doc.ts` e `types.ts`.
   > **Follow-ups:** remover model `RenderJob` do Prisma + migration drop (adiado — schema com WIP
   > paralelo); avaliar remoção do scene-engine vendorado/skia-canvas do backend se o Sprint 5
   > não usá-los (hoje nada no backend importa o engine).
   >
   > Plano original (substituição por renderScenePng), mantido como referência caso o render
   > server-side volte à pauta:

   **Plano de execução — matar o Playwright (2–3 dias, auditado 2026-07-03):**
   O Playwright vive num único lugar: `render.service.ts` (`renderToImages`, import dinâmico),
   servindo o pipeline `POST /render/:id` → fila `render` → processor. No frontend, só o editor
   LEGADO (`?legacy=1`) chama `triggerRender` — o estúdio Konva exporta client-side e não passa
   por ele. A troca é de implementação, mantendo o contrato (endpoint, fila, RenderJob e máquina
   de status intactos):
   - [ ] Trocar o miolo de `renderToImages`: `renderCarousel(html)` + `chromium.screenshot` →
         `renderScenePng` do `@publisher/scene-engine/node` (o shadow-compare já faz exatamente
         isso desde o Sprint 1 — vira o caminho principal em vez de sombra).
   - [ ] **Gap 1 — overrides do estúdio:** o server render monta o doc só com texto
         (`carouselToDoc`) e ignora `Slide.sceneOverrides` (payload v2 `{overrides, added,
         groups}`), `Content.styleData` e template custom (`layout`). O `DesignDocument` já tem os
         campos — falta popular. Mover o parse do payload v2 (`frontend lib/scene-payload.ts`) pro
         scene-engine (compartilhado) e montar o doc completo + kit efetivo (styleData sobre o kit
         do tenant, como o `useStudioScene` faz).
   - [ ] **Gap 2 — fontes:** `node/render.ts` só registra as fontes seed; Google Fonts do kit /
         overrides caem em fallback silencioso. Registrar as famílias extras (bytes já cacheados
         no MinIO pelo `FontCatalogService`) via `FontLibrary.use` + `FontkitMetrics.register`.
   - [ ] **Gap 3 — imagens:** `paintSlide` aceita `opts.resolveImage` mas o node render nunca
         passa → imagem de user node vira caixa cinza. Pré-resolver srcs via `loadImage` do
         skia-canvas antes do paint (mesmo trabalho que o logo do Brand Book F3.2 exige — fazer
         uma vez, servir aos dois).
   - [ ] **Gate de paridade (RFC Sprint 4):** golden de um content real com overrides + elemento
         livre + fonte Google + imagem — diff server vs export client < 1.5%.
   - [ ] **Remoção:** dep `playwright` do `package.json`, `template-engine.ts` +
         `template-engine.css.ts` (950 linhas de template HTML/CSS legado; único consumidor é o
         `render.service`), `ISOLATE_JS`, shadow-compare + env `RENDER_SHADOW_SKIA`.
         Critério de aceite: `grep -ri playwright src` vazio nos 2 repos.
   - Bônus (decisão de produto): aposentar o editor legado (`?legacy=1`) na sequência — é o único
     consumidor do botão de render no frontend.
   - Atenção operacional: o scene-engine é vendorado nos 2 repos — as mudanças de engine (payload
     v2 compartilhado, fontes, resolveImage) precisam ser replicadas em backend e frontend no
     mesmo ciclo.
2. **Sprint 5 (geração de imagem por slide — Nano Banana/GPT-5.5).** Feature de produto, não de
   conclusão. Backlog pós-launch.
3. **Sistema de agents (arquitetura bullq + Anthropic SDK direto).** Decidido em junho, 0% feito.
   Nenhuma feature atual depende dele. **Recomendação:** só puxar quando houver um caso de uso
   concreto (ex.: agente de pauta/calendário editorial).
4. **Gaps de publicação:** IG só publica CAROUSEL (STATIC sem adapter, REEL sem suporte em nenhuma
   rede). Definir se STATIC/IG entra no escopo de "concluído" — é o gap mais barato de fechar.
5. **Follow-ups menores registrados:** formato 4:5 (exige altura variável no engine), geração
   slot-aware pra templates custom, reflow por largura no resize de texto (handles E/W).

---

## 8. Riscos e dependências externas

| Risco | Impacto | Mitigação |
|---|---|---|
| App Review da Meta demora/nega `instagram_manage_insights` | Analytics sem dados | Disparar hoje (F3.0); UI já trata estado "coletando métricas" |
| pgvector indisponível no Postgres de prod | RAG bloqueado | Provisionar `pgvector/pgvector:pg16` desde F2 |
| Docs da empresa vão pra OpenAI (embeddings) | Privacidade | Decisão já tomada pelo JP; documentar no onboarding do tenant |
| skia-canvas não builda no target de deploy | Render server quebra | Validar na F2 antes do cutover; export client-side é o caminho principal |
| Vendoring do scene-engine diverge entre os 2 repos | Bug sutil de paridade | Toda mudança no engine = replicar nos 2 repos no mesmo PR; considerar publicar como pacote privado no futuro |
| Rows legadas de token em texto plano | Falha silenciosa em prod | Auditar + re-encrypt na F1 |

---

## 9. Sequência recomendada (visão de calendário)

```
Semana 1  │ F0 validação E2E + F1 higiene + F3.0 App Review (disparar)
Semana 1-2│ F2 deploy produção + smoke em prod
Semana 2-3│ F3.1 RAG (backend → frontend)
Semana 3-4│ F3.2 Brand Book (inclui resolveImage do Skia)
Semana 4-5│ F3.3 Analytics (se App Review aprovado; senão, F4.1 re-escopo Sprint 4)
```

**Definição de "sistema concluído":** F0+F1+F2 no ar (publicando de verdade, deploy reproduzível)
+ F3 completa (gerar conteúdo fiel à empresa, com a marca real, medindo o que performa).
F4 é evolução de produto, não conclusão.
