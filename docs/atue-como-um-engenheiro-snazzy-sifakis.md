# RFC — Editor de Carrossel WYSIWYG sobre um Engine de Cena Próprio (Konva)

> Documento de design técnico. Substitui o pipeline `Claude → HTML/CSS → Playwright → PNG` por um **engine de cena determinístico** com edição direta no canvas, render isomórfico (browser + Node) e identidade de nós estável. Escopo: gerador de carrossel 1080×1080 da marca JP.ASV / Claude Code BR.

---

## 0. Problema e tese

A queixa ("preview ruim, raso") tem **uma causa-raiz arquitetural**: o sistema tem **duas representações do mesmo slide que não compartilham código** —

- o template real (`backend/render/template-engine.ts` + `template-engine.css.ts`, ~950 linhas, design editorial cream/serif/coral), que só existe dentro do worker Playwright;
- o "preview" (`frontend/.../editor-split-layout.tsx`), uma reimplementação em JSX/Tailwind escuro que acerta ~40% do resultado.

Qualquer plano que conserte "o preview" sem matar a dualidade é paliativo. **A tese desta RFC**: o preview, o editor e o render final devem ser a mesma função pura de uma mesma estrutura de dados. Isso é o que Figma e Canva fazem — um *scene graph* canônico, renderizado por um painter, editado por uma camada de interação, serializado por um documento versionado.

Decisões já travadas com o stakeholder:
- **Engine = Konva** (MIT, grátis). Polotno (US$899/mês) é só um editor pronto *em cima* do Konva; construímos o editor enxuto que a marca precisa.
- **Render isomórfico**: `react-konva` no browser; `konva` + **skia-canvas** no Node (sem headless browser).
- **Wizard 6 passos**: 1-3 guiados → "Gerar" → canvas vivo persiste em 4 (editar), 5 (caption/CTA), 6 (agendar).
- **Edição = texto inline + transform visual** (mover/redimensionar/recolorir), com overrides persistidos.
- **Código compartilhado** via pnpm workspace (`packages/scene-engine`).
- **Render server-side de apoio** (lote/cron/republicação sem usuário): sim.

O risco central **não é o Konva** — é o que o Konva *não* te dá: **layout de texto rico determinístico** e **paridade pixel client/server**. 80% do esforço de engenharia desta RFC está aí. O resto é montagem.

---

## 1. Arquitetura — uma cena, três consumidores

```
 Claude (prompts atuais — preservados)
      │ GenerationOutput  (Zod-validado)
      ▼
 ┌──────────────────────────────────────────────────────────────┐
 │ DESIGN DOCUMENT  (persistido, versionado)                      │
 │   ContentText   = fonte de verdade do TEXTO (regenerável)      │
 │   TemplateRef   = programa de layout (step | compendium)       │
 │   OverrideMap   = deltas do usuário, por nodeId, esparso        │
 └──────────────────────────────────────────────────────────────┘
      │  resolveScene(doc, fontMetrics)         ← FUNÇÃO PURA, isomórfica
      ▼
 ┌──────────────────────────────────────────────────────────────┐
 │ SCENE GRAPH  (derivado, não persistido — geometria absoluta)   │
 │   SceneSlide[] → SceneNode[]  (frames já calculados em px)      │
 └──────────────────────────────────────────────────────────────┘
      │                    │                         │
 react-konva          stage.toCanvas            konva + skia-canvas
 (browser)            (export client)           (render Node, sem browser)
 = EDITOR/PREVIEW     = PNG no "Aprovar"         = lote/cron/republicação
```

Invariante mestre: **`resolveScene` é determinístico e idêntico nos dois runtimes**. Dado o mesmo `DesignDoc` e as mesmas métricas de fonte, produz o mesmo `SceneGraph` byte-a-byte. A única diferença permitida entre client e server é a **rasterização** (anti-aliasing sub-pixel), coberta por tolerância de diff. Layout **nunca** depende do `measureText` do runtime (ver §3).

### Fronteiras de módulo (pnpm workspace)

```
packages/scene-engine/        ← isomórfico, zero deps de framework/DOM
  src/
    tokens.ts                 resolveTokens(brandKit) — tokens derivados do Brand Kit do tenant (NÃO hardcoded; §13)
    brand-kit.ts              tipos BrandKit/FontRole + kit-seed (editorial JP.ASV default)
    fonts/catalog.ts          shortlist curada + busca Google Fonts; fetch/cache de bytes por hash
    doc.ts                    DesignDocument, ContentText, OverrideMap, schemaVersion
    scene.ts                  SceneGraph, SceneNode (union discriminada)
    ids.ts                    geração de NodeId estável (path-based)
    resolve.ts                resolveScene(doc, metrics) → SceneGraph  [coração]
    templates/
      step.ts                 layout program família "step" (cover/body/cta)
      compendium.ts           layout program família "compendium"
      registry.ts             TemplateProgram interface + lookup
    text/
      runs.ts                 ContentText → StyledRun[] (campos estruturados + parser inline <em>/<strong>/<code>)
      metrics.ts              MetricsProvider (fontkit) — advance widths determinísticos
      linebreak.ts            quebra gulosa por caixa + auto-fit (shrink-to-fit)
      layout.ts               StyledRun[] + box → PositionedLine[] → GlyphRun nodes
    overrides.ts              merge + reconciliação pós-regeneração
    migrate.ts                migrações de schemaVersion
    fonts/                    DMSerifDisplay-Italic.otf, PlusJakartaSans-{400..800}.ttf, JetBrainsMono-{400,500,600}.ttf
  __fixtures__/               DesignDocs de teste (golden)
  __goldens__/                PNGs de referência (visual regression)

frontend/src/features/content/studio/   ← react-konva (client-only)
backend/src/modules/render/              ← skia-canvas worker
backend/src/modules/generation/          ← Claude + Zod + regenerate-slide
```

`scene-engine` compila pra ESM, `target: es2022`, sem `dom` lib. Frontend importa direto; backend importa o mesmo build. Fontes embarcadas no pacote → uma fonte de verdade física dos arquivos.

---

## 2. Document Model

### 2.1 Sistema de coordenadas

- **Design space**: 1080×1080 px, origem top-left, eixo Y pra baixo. Toda geometria do `SceneGraph` é em design px absolutos (nunca relativo/escala).
- **Viewport**: o Stage no browser aplica `scale = min(containerW, containerH)/1080` só pra exibição; export e server renderizam no espaço natural com `pixelRatio: 2` → PNG 2160² (mantém o `deviceScaleFactor: 2` atual).
- Snapping, nudge e overrides operam **sempre em design px**, independentes do zoom.

### 2.2 Taxonomia de nós (`scene.ts`)

```ts
export type NodeId = string; // estável — ver §2.4

export interface BaseNode {
  id: NodeId;
  frame: Rect;                 // x,y,w,h em design px (já resolvido)
  rotation?: number;           // graus
  opacity?: number;
  locked?: boolean;            // decoração travada por padrão
  z: number;                   // ordem de pintura dentro do slide
}

export type SceneNode =
  | RectNode        // fundos, cards, callout, underline, keyword pill, terminal box
  | LineNode        // colchetes de canto, divisores (footer/stat border)
  | GlyphRunNode    // UMA linha visual de UM estilo (saída do layout de texto)
  | ImageNode       // assets futuros / ícones rasterizados
  | GroupNode;      // agrupamento lógico (ex.: um card = group{rect, glyphruns})

export interface GlyphRunNode extends BaseNode {
  type: 'glyphrun';
  text: string;                // já quebrado em linha; SEM wrap no Konva
  style: ResolvedTextStyle;    // family, weight, italic, size, fill, letterSpacing
  baselineY: number;           // baseline absoluto (alinhamento entre estilos na linha)
}
```

Decisão: **o texto não é um nó "rich text" mono-bloco**. O layout (§3) explode cada parágrafo/headline em `GlyphRunNode`s — um por (linha × estilo contíguo). Konva pinta cada um como `Konva.Text` de linha única com `wrap:'none'`, posicionado em coordenada absoluta. Isso resolve o problema que mata implementações ingênuas: **wrapping correto através de fronteira de estilo** (sans bold ink + serif itálico coral na mesma linha).

### 2.3 ContentText (fonte de verdade editável)

Reusa os campos que o LLM **já** produz (`backend/render/types.ts` — `CarouselInput`/`SlideInput`), normalizados em camelCase. Pontos-chave que tornam o layout tratável:

- Headline já vem **pré-segmentada**: `headlineTop` (sans ink) · `headlineEm` (serif itálico coral) · `headlineBottom` (sans ink). Não preciso parsear markup pra o caso dominante.
- Hook da capa, callout, cta-text contêm markup inline (`<em>`, `<strong>`, `<span class=strong|keyword>`, `<code>`). Esses passam por `runs.ts` (parser tolerante → `StyledRun[]`).
- Body é union de variantes: `paragraphs[] | list[] | stats[[num,text]] | cards[]`.
- **Imagem (opcional, por slide)**: `image?: SlideImage` (ver §12) — toggle, papel, prompt, modelo, asset. Quando presente e habilitada, o `TemplateProgram` escolhe a variante de layout com imagem.

### 2.4 Identidade de nós estável (`ids.ts`) — pré-requisito dos overrides

Override só sobrevive à regeneração e à edição de outros campos se cada nó tiver **id semântico determinístico**, não índice posicional volátil:

```
cover/topbar.label        cover/asterisk        cover/hook[line=2,run=1]
slide[2]/topbar.step      slide[2]/headline.em  slide[2]/body.bullet[3]
slide[2]/card[1].title    slide[2]/decoration.bgnum    cta/keyword
```

Regras:
- IDs de **container semântico** (`slide[2]/headline`, `slide[2]/card[1]`) são estáveis enquanto o slot existir.
- IDs de **GlyphRun derivados de layout** (`...headline.em[line=2,run=1]`) são voláteis (mudam se o texto reflui) → **não recebem override de geometria**. Overrides de geometria/estilo ancoram no **container**, não no glyphrun. O layout reposiciona glyphruns dentro do frame do container (que pode estar overridado).
- Coleções (bullets, cards) usam índice **estável por origem** (ordem em que o LLM gerou), não por posição visual.

Consequência de design: **o usuário move/redimensiona containers** (a headline inteira, um card, o callout), não pedaços de linha. Isso bate com a UX do Canva (você seleciona "o bloco de texto") e mantém o reflow correto.

### 2.5 OverrideMap (`doc.ts`) — deltas esparsos

```ts
interface OverrideMap { [nodeId: NodeId]: NodeOverride }
interface NodeOverride {
  frame?: Partial<Rect>;       // x,y,w,h — w dispara re-layout de texto
  rotation?: number;
  fill?: string;               // recolorir (dentro da paleta da marca, validado)
  fontScale?: number;          // escala tipográfica do container (corner-resize)
  hidden?: boolean;
}
```

Persistido por slide em `Slide.sceneOverrides` (JSON). Esparso: só nós tocados. `resolveScene` aplica em cima do default do template.

### 2.6 Precedência de resolução

Para cada nó, `resolveScene` calcula:
1. **Texto** ← sempre do `ContentText` (override nunca carrega texto).
2. **Geometria default** ← `TemplateProgram` (flow layout do template).
3. **Override** ← merge raso por propriedade sobre (2). `frame.w` overridado → re-roda o layout de texto daquele container na nova largura.
4. **Validação** ← `fill` deve estar na paleta; `frame` clampeado ao slide com margem mínima; `fontScale ∈ [0.5, 2]`.

### 2.7 Reconciliação pós-regeneração (`overrides.ts`)

Ao regenerar 1 slide (ou o carrossel), o conjunto de nós muda (ex.: 4 bullets → 3). Algoritmo:
- containers que **persistem por id** (`headline`, `topbar`, `card[0]`) → overrides mantidos.
- containers que **somem** (`card[3]` quando agora só há 3) → overrides descartados (logados).
- containers **novos** → sem override (default).
- Regeneração explícita de um slide oferece **"manter ajustes visuais?"** (default: manter os que casam por id).

### 2.8 Versionamento (`migrate.ts`)

`DesignDocument.schemaVersion` (int). Loader roda migrações sequenciais idempotentes antes de `resolveScene`. Goldens de teste fixam cada versão. Sem isso, qualquer mudança no formato de override quebra documentos salvos.

---

## 3. Text Layout Engine — o núcleo difícil

Konva.Text faz wrap por palavra, mas: (a) **um estilo por nó** — não suporta a headline mista nem `<em>` inline; (b) o wrap usa `measureText` do runtime → **não determinístico entre browser e skia**; (c) não tem auto-fit. Construímos o layout nós.

### 3.1 Modelo de runs (`text/runs.ts`)

`ContentText` → `StyledRun[]`:
```ts
interface StyledRun { text: string; style: TextStyleKey } // 'ink' | 'em' | 'strong' | 'code' | 'keyword'
```
- Headline: `[{headlineTop,'ink'},{headlineEm,'em'},{headlineBottom,'ink'}]` direto.
- Campos com markup: parser inline tolerante (regex + stack) mapeando `<em>→em`, `<strong>/.strong→strong`, `<code>/.cmd→code`, `.keyword→keyword`. Markup malformado degrada pra texto puro (nunca quebra).
- Cada `TextStyleKey` resolve pra `ResolvedTextStyle` via `resolveTokens(brandKit)` no contexto do slide (ex.: em CTA, `ink`→`bg`). As specs do kit-seed editorial (headline display 800/78px/lh1.04/ls-0.025em; `accent` serif italic ~0.96em; body 34px/lh1.32; card-title 800/38px; stat-num serif 58px) são o **default**, sobrescritíveis por tenant (§13).

### 3.2 Provedor de métricas determinístico (`text/metrics.ts`) — decisão-chave de paridade

**Não usar `ctx.measureText`** (diverge entre Chrome e skia → quebras de linha diferentes → cenas diferentes). Em vez disso: ler as métricas direto do arquivo de fonte com **fontkit** (`advanceWidth` por glifo via tabela `hmtx`, kerning via `kern`/GPOS). Idêntico em qualquer runtime porque é o mesmo `.otf`/`.ttf` lido como bytes.

```ts
interface MetricsProvider {
  measureRun(text: string, style: ResolvedTextStyle): { width: number; ascent: number; descent: number };
  // soma advances * (fontSize/unitsPerEm) + letterSpacing*(n-1), com kerning
}
```
- Cache por (string, styleKey, size) — texto repete bastante.
- Browser e backend instanciam o **mesmo** `FontkitMetrics` com os **mesmos arquivos** do pacote. Layout vira função pura das métricas → paridade garantida no nível de geometria.
- Konva/skia só **pintam** os glifos nas posições que nós ditamos (Konva com `wrap:'none'`, sem medir/quebrar nada). Diferença de rasterizador fica sub-visual.

### 3.3 Quebra de linha + auto-fit (`text/linebreak.ts`)

Greedy line-break clássico, com caixa de largura `W` (largura do container, default do template ou override):
- tokeniza runs em "itens" (palavra + espaço, preservando estilo); quebra em `\n` explícito.
- acumula itens na linha enquanto `Σwidth ≤ W`; estoura → nova linha. Mantém o estilo por item (uma linha pode ter itens de estilos diferentes).
- **Auto-fit (shrink-to-fit)**: headlines do LLM variam muito. Se `totalHeight > boxHeight` disponível, busca binária em `fontScale ∈ [floor, 1]` (floor por papel: headline 0.7, body 0.85) re-rodando o break até caber; abaixo do floor, aplica reticências na última linha. Determinístico (sem depender de render).
- `letterSpacing` negativo (as headlines usam -0.025em) entra no cálculo de largura.

### 3.4 Posicionamento vertical e baseline (`text/layout.ts`)

- `lineHeight` resolvido em px (`size * lh`). `lineGap` por papel (bullets gap 24, etc. — do CSS).
- **Baseline compartilhada por linha**: numa linha com sans 78px + serif italic 75px, ambos alinham pela baseline (`baselineY = lineTop + maxAscent`). Cada run vira `GlyphRunNode{ baselineY, x }`; o painter posiciona via `Konva.Text` com `verticalAlign` + offset de ascent (calculado das métricas), não pelo top do nó. Isso evita o "texto dançando" entre fontes.
- Merge: runs contíguos do **mesmo estilo** na **mesma linha** colapsam num `GlyphRunNode` (limita contagem de nós).
- Saída: `PositionedLine[]` → `GlyphRunNode[]` ancorados no frame do container.

### 3.5 Flow layout dos templates (`templates/step.ts`, `compendium.ts`)

Cada `TemplateProgram` é uma função `(content, slideIndex, ctx) → SceneNode[]` que posiciona os containers em **fluxo vertical** dentro do padding (step 88×96), empilhando topbar → kicker → headline → underline → body → callout → footer, medindo cada bloco de texto pelo engine e avançando o cursor Y. Containers `margin-top:auto` (footer, footer-tags, callout) ancoram no rodapé. Decoração (colchetes, bg-num, asterisco, underline) são nós estáticos posicionados por coordenada fixa derivada do CSS. **Este é o port literal** de `template-engine.ts` (que já tenho mapeado linha a linha) para emissão de `SceneNode` em vez de string HTML.

---

## 4. Render & Paridade

### 4.1 Painter client (`react-konva`)
- `<Stage w=1080 h=1080 scale=fit>` → `<Layer name="static">` (decoração, `.cache()` — não repinta em edição de texto) + `<Layer name="content">` (glyphruns, cards) + `<Layer name="ui">` (Transformer, guides).
- `SceneNode → componente`: `glyphrun→<Text wrap='none' …>`, `rect→<Rect>`, `line→<Line>`, `image→<Image>`. Mapeamento burro: o engine já resolveu tudo.
- `batchDraw`; só a layer `content` repinta em edição.

### 4.2 Painter server (`backend/render`)
- `konva` headless + **skia-canvas** (binários pré-compilados; evita build de Cairo em Docker; Skia ≈ o rasterizador do Chrome → menor divergência).
- `resolveScene(doc, metrics)` → monta `Konva.Stage` programático → por slide `stage.toBuffer({pixelRatio:2})` (ou `layer.toCanvas()` → PNG buffer) → `minio.putBuffer`.
- Aplica os **mesmos overrides** que o client (mesmo `resolveScene`). Paridade testada (§4.5).

### 4.3 Pipeline de fontes
- Browser: `FontFace` API, `document.fonts.load()` de cada (family,weight,style) **realmente usada**, `Promise.all` antes do primeiro `resolveScene`/paint. Sem isso, primeira pintura mede/posiciona errado.
- Server: `FontLibrary.use()` (skia) + `fontkit.openSync()` (métricas) no boot do worker; falha de fonte = crash no boot (fail-fast), não no job.
- woff2 (web) + otf/ttf (skia+fontkit) versionados no pacote. Subsetting fica fora de escopo v1.

### 4.4 Export (client) — qualidade
- Export **não** usa o stage on-screen (escalado). Monta um stage offscreen 1080² natural, `pixelRatio:2` → 2160². Slide-a-slide pra limitar memória (não 6 stages simultâneos). Resultado → blob → upload (§6.3) → `Slide.imageUrl/imageKey`.

### 4.5 Contrato de paridade (teste, não runtime)
- **Visual regression**: `__goldens__/` com PNGs de referência por fixture; CI roda o render server e diffa com `pixelmatch` (limiar < 0.5% de pixels). Quebra de golden exige re-aprovação explícita.
- **Client≡Server**: harness de Sprint 4 captura o export do client (Playwright **só em teste**, fora do runtime de produto) e diffa contra o render server do mesmo doc (limiar < 1.5%, absorvendo anti-alias). Divergência acima → bug de fonte/métrica.
- **Layout unit tests**: dado fixture + métricas mockadas, `resolveScene` retorna frames esperados (testa quebra de linha, auto-fit, baseline) sem render.

---

## 5. Editor (camada de interação)

### 5.1 Seleção & Transform
- Seleção = um container (`headline`, `card[1]`, `callout`…), nunca glyphrun. `<Transformer>` do Konva preso ao bounding box do container.
- **Handles de texto**: laterais (E/W) mudam `frame.w` → dispara re-layout (reflow, como Canva). Cantos mudam `fontScale` (escala tipográfica, sem reflow de largura). Rotação habilitada.
- **Handles de imagem**: cantos com aspect-lock.
- Decoração (`locked:true`) não selecionável por padrão; toggle "editar decoração" libera.
- Multi-seleção (shift-click / marquee) → transform de grupo.

### 5.2 Snapping & smart guides
- Snap a: centro do slide (H/V), bordas do padding, e bordas/centros de irmãos visíveis. Threshold 8 design px. Render de linhas-guia coral na layer `ui` durante o drag.
- Nudge por teclado: ←↑→↓ 1px, +Shift 10px. Escreve override.

### 5.3 Edição de texto inline
- Double-click num container de texto → overlay `<textarea>`/`contentEditable` posicionado e estilizado igual ao container (transform do stage aplicado), Konva escondido enquanto edita.
- **A edição escreve no campo do `ContentText`** (ex.: `headlineEm`, `bullets[2]`), não nos glyphruns. Ao confirmar (blur/Esc/Enter conforme campo), `resolveScene` re-deriva e repinta. Caret/seleção mapeiam pro campo-fonte; markup inline (`<em>`) editável via toolbar flutuante (B / serif-em / code) que insere os spans no campo.
- Campos com estrutura (bullets, cards) editam item a item; "+ bullet"/"remover" alteram o `ContentText` (e reconciliam overrides).

### 5.4 Undo/Redo
- Command stack por documento. Comandos: `EditText`, `SetOverride`, `RegenerateSlide`, `AddRemoveItem`, `ReorderSlide`. Cada um com `apply`/`invert` (patches imutáveis — immer).
- **Coalescing**: um drag inteiro = 1 comando (commit no `transformend`/`dragend`); digitação coalesce por janela de 500ms.
- Escopo: memória da sessão do editor (não persistido). `Ctrl/Cmd+Z / Shift+Z`.

### 5.5 Performance
- Slide ativo = Konva vivo. **Thumbnails = imagem rasterizada** (`toCanvas` 1×, cacheada), não 6 stages vivos.
- `node.cache()` na layer `static` (decoração) → edição de texto não a repinta.
- `resolveScene` memoizado por `(docHash, slideIndex)`; edição invalida só o slide tocado.
- Orçamento: ~30–70 nós/slide → trivial pro Konva. Sem virtualização.

---

## 6. Backend

### 6.1 Prisma (migração aditiva)
```prisma
model Slide {
  // ...campos atuais...
  sceneOverrides Json?  @map("scene_overrides")
  @@unique([contentId, position])           // mata o race de findOrCreateSlideId
}
model Content {
  // ...campos atuais...
  docVersion         Int    @default(1) @map("doc_version")        // schemaVersion do DesignDoc
  brandKitId         String? @map("brand_kit_id")                  // kit aplicado
  brandKitVersion    Int?   @map("brand_kit_version")              // snapshot p/ não reflui silencioso (§13.2)
  typographyOverride Json?  @map("typography_override")            // override de fonte por post (dropdown do gerador)
}
model BrandKit {                                   // NOVO — §13. style guide por tenant
  id String @id @default(uuid())
  tenantId String @map("tenant_id")
  version Int @default(1)
  typography Json   // papéis display/body/mono/accent → FontRole
  palette    Json   // tokens nomeados
  brand      Json   // handle, breadcrumb, ctaKeyword, logoGlyph
  isDefault  Boolean @default(false) @map("is_default")
  tenant Tenant @relation(fields: [tenantId], references: [id])
  @@map("brand_kits")
}
```
`Content.slidesData` segue como fonte de texto (sem migração de dados — docs existentes abrem no editor novo sem overrides).

### 6.2 Geração resiliente (`generation.service.ts`)
- `GenerationOutputSchema` (Zod) espelhando `GenerationOutput`. Parse → em erro, **repair loop**: reenvia ao Claude os erros do Zod pedindo correção (1 retry) antes de falhar.
- `withRetry` (3×, backoff 0.5/2/8s) + `AbortSignal.timeout(30_000)` na chamada Anthropic.
- Sempre grava `Generation` (mesmo em falha) p/ observabilidade.
- Fact-check (já integrado, linhas 101-122): `warnings → DRAFT`; promover `issues` bloqueantes (lei/IN fora da whitelist) a `FAILED` com motivo.
- Modelo segue `claude-sonnet-4-6`; cache `ephemeral` mantido.

### 6.3 API (contratos)
```
POST   /generation                 {tema,persona,pattern}        → Content(+slides)         [201]
POST   /generation/regenerate-slide {contentId,position,hint?}   → SlideText                [200]
GET    /contents/:id                                             → Content(+slides+doc)
GET    /contents/:id/scene                                       → SceneGraph (server-resolved; fallback/preview SSR)
PATCH  /contents/:id/slides/:position { text?, sceneOverrides? } → Slide                     [200]
POST   /contents/:id/render          {}                          → RenderJob (enqueue, lote/cron)
POST   /uploads/slide-image          (multipart png)             → {imageUrl,imageKey}       (export client)
GET    /contents/:id/events          (SSE)                       → stream de eventos
```

### 6.4 Regenerate-slide (merge)
- Prompt focado: persona/pattern/template do Content + os slides vizinhos como contexto + `hint`. Output = **um** `SlideInput`, Zod-validado.
- Splice em `slidesData.slides[position-1]` + `Slide.bodyData`; reconcilia overrides (§2.7); marca slide "stale" pra re-render/re-export.

### 6.5 Render worker (`render.processor.ts`)
- **Remove Playwright** (código + `package.json`). Worker: `resolveScene` → skia stage → PNG → MinIO → upsert Slide (upsert composto, sem `findOrCreateSlideId`).
- BullMQ `attempts:3`, backoff exponencial; falha terminal → `Content.status=FAILED` + `lastError`. **Idempotente** por `renderJobId` (re-exec não duplica). Concurrency configurável (`render.config.ts`).

### 6.6 SSE (`events.controller.ts`)
- Eventos tipados: `generation.started|fact_check|completed|failed`, `render.slide{position,total}`, `render.completed|failed`. Bridge dos eventos BullMQ + hooks da geração. Front consome via `EventSource` (`use-content-events.ts`) → progresso real (mata o polling de 3s).

---

## 7. UX — wizard interativo (state machine)

`wizard-store.ts` (Zustand) vira uma máquina de estados explícita:
```
PERSONA → PATTERN → THEME → (GERANDO: SSE) → STUDIO{ EDIT_SLIDES → CAPTION_CTA → SCHEDULE }
```
- 1-3: cards enxutos, validação por etapa (reusa `step-persona/pattern/theme`).
- "Gerar": `POST /generation`, tela de geração com as 3 fases via SSE.
- 4-6: **mesmo `StudioShell`** montado; o passo só muda qual painel lateral/foco aparece. Canvas persiste. `studio-progress` (barra fina) substitui `wizard-stepper`.
- Botões: Salvar (debounce 2s, optimistic), Aprovar (export client → MinIO → `status=READY`), Agendar (reusa `publish-dialog`).
- Mobile < 1024px: tabs **Editar | Preview**; Transformer vira controles touch; inspector em bottom-sheet.

---

## 8. Migração & rollout

- **Sem backfill**: `resolveScene` consome os campos de texto que já existem. Docs antigos abrem sem overrides.
- **Feature flag** `STUDIO_KONVA` (por tenant). Rota `/content/[id]` serve estúdio novo sob flag; editor antigo fica read-only até cutover.
- **Shadow compare** (Sprint 1-2): worker novo (Konva) e antigo (Playwright) renderizam em paralelo p/ um conjunto de contents; diff `pixelmatch` em log. Cutover quando diff médio aceitável e goldens aprovados.
- **Remoção do Playwright** só no Sprint 4, após cutover do worker.

---

## 9. Estratégia de testes

| Camada | Teste | Ferramenta |
|---|---|---|
| `text/*`, `resolve.ts` | unit: quebra de linha, auto-fit, baseline, reconciliação de override | vitest + métricas reais (fontkit) |
| `templates/*` | snapshot de `SceneGraph` por fixture | vitest |
| render server | visual regression vs `__goldens__` | skia + pixelmatch (<0.5%) |
| paridade | client export ≡ server render | Playwright (test-only) + pixelmatch (<1.5%) |
| geração | Zod + repair loop (mock Anthropic), fact-check gating | vitest + nock |
| editor | seleção/transform/undo/snap | RTL + konva test utils |
| e2e | persona→…→aprovar→agendar | Playwright |

---

## 10. Sprints (gates de aceite duros)

**Sprint 1 — Engine + paridade (semana 1)**
Workspace `scene-engine`; **`resolveTokens(brandKit)` + kit-seed editorial** (sem hardcode); `MetricsProvider` (fontkit, fontes bundladas do seed); `text/{runs,linebreak,layout}`; `templates/step` referenciando papéis/tokens; `resolve(doc,metrics,brandKit)`. Worker server skia renderizando família step. Shadow-compare ligado.
- **Gate**: PNG Konva/skia de 3 fixtures (capa, body-bullets, cta) com diff < 1% vs golden curado do template atual; auto-fit não estoura caixa em headline longa.

**Sprint 2 — Estúdio editável (semana 2)**
`react-konva` (dynamic ssr:false), fontes gated, painter; inline text edit (→ ContentText); `<Transformer>` + overrides (`use-overrides` → PATCH); snapping/guides; undo/redo; thumbnails rasterizados; export client → MinIO.
- **Gate**: editar headline reflete <100ms; mover/redimensionar persiste e sobrevive a reload; "Aprovar" gera PNG idêntico ao preview (diff <1.5%); undo/redo cobre texto+transform.

**Sprint 3 — Wizard + regeneração + compendium (semana 3)**
`templates/compendium` portado; máquina de estados 1-3→4-6; `regenerate-slide` (backend + botão + reconciliação); Zod + retry/timeout na geração.
- **Gate**: fluxo ponta-a-ponta < 90s; regerar 1 slide com hint preserva overrides dos demais; ambas as famílias renderizam client≡server.

**Sprint 4 — Server render, SSE, mobile, limpeza (semana 4)**
SSE + 3 fases; idempotência/retry do worker; paridade de overrides no server; mobile (tabs/bottom-sheet); **remoção do Playwright** (código+deps); cutover da flag.
- **Gate**: render server-side em lote (sem browser) = client (diff <1.5%); `grep -r playwright` vazio; mobile usável; goldens verdes no CI.

**Sprint 5 — Geração de imagem em slides (semana 5)**
Módulo `images` + providers Nano Banana/GPT-5.5; fila `image-gen` + SSE; `SlideImage` no modelo + sugestão da IA na geração; variantes de layout `figure`/`background` no scene engine (split + scrim/treatment); painel "Imagem" no inspector (toggle/papel/modelo/prompt/variações/foco/upload).
- **Gate**: ligar imagem num slide → gerar via cada provider → `ImageNode` aparece idêntico no preview e no render server; reflow split correto; background com contraste AA; regenerar por seed reproduz.

**Sprint 6 — Brand Kit multi-tenant + fontes dinâmicas (semana 6)**
`BrandKit` (Prisma + seed por tenant); `FontCatalogService` (shortlist + busca Google Fonts) + fetch/cache de bytes por hash + registro dual (FontFace/skia/fontkit) com fallback de peso; Settings → Brand Kit (papéis/paleta/strings, preview ao vivo); dropdown de fonte no gerador (`typographyOverride` por post); swatches do inspector vindos do kit; snapshot `brandKitVersion` + "atualizar p/ marca vigente".
- **Gate**: dois tenants com kits distintos renderizam o MESMO conteúdo com tipografia/paleta próprias; trocar a fonte no gerador reflete no preview e no render server (mesma quebra de linha — métricas do arquivo cacheado); fonte do catálogo completo baixa, cacheia e renderiza determinística; nenhum hex/família literal em `templates/*`.

---

## 11. Riscos & mitigações

| Risco | Severidade | Mitigação |
|---|---|---|
| Divergência de quebra de linha client/server | 🔴 mata o WYSIWYG | Métricas via fontkit (mesmos bytes de fonte), **nunca** `measureText`; Konva pinta sem medir; paridade em CI |
| Port do design pra nós Konva é grande/sutil | 🟠 | Tokens centralizados; port 1:1 de `template-engine.ts` (já mapeado); golden visual no Sprint 1 antes de avançar |
| Auto-fit feio em texto extremo do LLM | 🟠 | Floor por papel + reticências; e teto de caracteres no prompt (já existe limite de hook) |
| skia-canvas/native em Docker | 🟡 | Binários pré-compilados (skia-canvas, não Cairo); validar no boot |
| Edição inline de markup `<em>` confusa | 🟡 | Toolbar flutuante (B/serif/code) que insere spans no campo; markup malformado degrada pra texto |
| Reconciliação de override após regenerar | 🟡 | IDs semânticos estáveis + descarte logado + confirmação "manter ajustes?" |
| Konva + React 19 / Next 16 SSR | 🟢 | `react-konva` v19; `dynamic(ssr:false)`; engine puro não toca DOM |
| Imagem gerada com texto/artefato fora da marca | 🟡 | Negative prompt "no text"; brand suffix; safety do provider; variações + regenerar; upload manual como escape |
| Latência/custo de geração de imagem | 🟡 | Fila própria + SSE; imagem é opcional; metragem de custo por provider; cache por seed/promptHash |
| Fonte do tenant sem o peso usado / fetch lento / divergência | 🟠 | Fallback de peso + log; cache de bytes por hash no MinIO (1 fetch); ambos runtimes leem o mesmo arquivo → métrica idêntica (§13.3); auto-fit absorve largura |
| Editar Brand Kit reflui posts já aprovados | 🟡 | Snapshot `brandKitVersion` no doc; mudança só aplica via ação explícita "atualizar p/ marca vigente" (§13.2) |

---

## 12. Geração de imagem em slides (Nano Banana · GPT-5.5)

Imagem é **opcional e por slide**. Decisões travadas: dois provedores raster (**Nano Banana** = Gemini image; **GPT-5.5 image**); Opus 4.8 **não** entra (Claude não rasteriza — segue só no texto/art-direction do prompt); composição **por papel escolhido no slide**; **IA sugere, user confirma**.

### 12.1 Modelo de dados (`SlideImage`)
```ts
interface SlideImage {
  enabled: boolean;
  role: 'figure' | 'background';   // figure = região/split; background = full-bleed tratado
  prompt: string;                  // editável; pré-preenchido pela IA
  model: 'nano-banana' | 'gpt-5.5-image';
  seed?: number;                   // reprodutibilidade / variações
  focal?: {x:number;y:number};     // ponto focal p/ crop (cover)
  treatment?: 'duotone'|'grain'|'none'; // só background
  status: 'idle'|'queued'|'generating'|'ready'|'failed';
  assetKey?: string; assetUrl?: string; width?: number; height?: number;
  lastError?: string;
}
```
Persistido junto do slide (`slidesData.slides[i].image` + espelho em `Slide.bodyData`). O asset vive no MinIO.

### 12.2 Integração no scene engine
- `resolveScene`: se `image.enabled && status==='ready'`, injeta um `ImageNode` (frame ditado pelo papel) e o `TemplateProgram` ramifica para a **variante de layout com imagem**:
  - `figure` → layout split (texto reflui pra ~52% da largura; imagem na região oposta, `objectFit: cover`, crop pelo `focal`).
  - `background` → `ImageNode` full-bleed atrás de tudo + **scrim** (gradiente/overlay automático calculado pra garantir contraste AA do texto por cima) + `treatment` (duotone na paleta / grain).
- **Paridade trivial**: client e server carregam a **mesma URL** do MinIO → pixel-idêntico (nenhum problema de fonte/medida; a complexidade de §3 não se aplica a raster).
- Enquanto `generating`: `ImageNode` mostra **shimmer/placeholder**; o resto do slide é editável normalmente.

### 12.3 Provider abstraction (backend)
```ts
interface ImageProvider {
  generate(brief: ImageBrief): Promise<{assetKey:string;width:number;height:number}>;
}
// brief = { prompt, aspect, seed?, count? }  (aspect derivado do papel: figure 1:1 ou 4:5; background 1:1)
```
- `NanoBananaProvider` (Gemini image) e `OpenAIImageProvider` (gpt-5.5-image). Registry por `model`.
- **Art-direction**: o `prompt` do usuário é enriquecido por um *brand suffix* (paleta cream/coral, "editorial, muted, film grain") + **negative prompt** `"no text, no letters, no watermark"` — o texto é a camada editorial por cima, nunca dentro do raster. A geração inicial do carrossel (Claude) já **sugere** `image.recommended/role/prompt` por slide (campo extra no `GenerationOutput`); user liga o toggle e ajusta.
- `model/prompt/seed` salvos → **regenerar idêntico** ou pedir **N variações** (grid de escolha).
- Custo metrado por provider em `usage`; safety filter do provider respeitado (falha → `status=failed`, slide não bloqueia o resto).

### 12.4 Pipeline assíncrono
- Fila BullMQ `image-gen` (separada de `render`). `POST /generation/slide-image {contentId,position}` enfileira; eventos `image.queued|generating|ready|failed` no SSE existente (§6.6).
- Worker: `provider.generate(brief)` → buffer → `minio.putBuffer` → atualiza `SlideImage` → invalida cena do slide → front repinta. `attempts:2`, sem retry em erro de safety (terminal).
- Idempotência por `(contentId,position,seed,promptHash)`.

### 12.5 UX no inspector (painel "Imagem" por slide)
- Toggle **Imagem neste slide** (default = sugestão da IA).
- Seletor de **papel** (Figura | Fundo) com preview do reflow.
- **Modelo**: Nano Banana | GPT-5.5 (chips), com nota de custo/velocidade.
- **Prompt** (textarea pré-preenchido pela IA) + botão **Gerar** / **Variações** (gera 3, user pica) / **Regerar**.
- Pós-geração: arrastar **ponto focal**, escolher `treatment` (só fundo), **Substituir/Upload** manual.
- Estado `generating` com shimmer + progresso via SSE.

### 12.6 Backend — módulo
`modules/images/`: `image.controller.ts`, `image.service.ts`, `image.processor.ts` (queue `image-gen`), `providers/{nano-banana,openai}.provider.ts`, `providers/registry.ts`, `image-brief.ts` (brand suffix + negative + aspect por papel). Schema: `SlideImage` mora em `slidesData`/`bodyData` (sem coluna nova; asset no MinIO).

---

## 13. Brand Kit multi-tenant (tipografia + paleta) — fim do hardcode

**Premissa corrigida:** a app é multi-tenant; cada tenant tem seu próprio style guide. Os tokens **não** são constantes no código — `tokens.ts` vira `resolveTokens(brandKit)`, função pura do **Brand Kit do tenant**. O kit editorial JP.ASV atual (cream/ink/coral, DM Serif + Jakarta + JetBrains) é só o **seed default** semeado pra novos tenants, não algo embutido.

### 13.1 Modelo (`BrandKit`, por tenant)
```ts
interface BrandKit {
  id; tenantId; version: int;
  typography: {                          // PAPÉIS, não famílias fixas
    display: FontRole;                   // headline
    body:    FontRole;
    mono:    FontRole;                   // labels/topbar/footer
    accent:  FontRole;                   // ênfase (o serif itálico hoje)
  };
  palette: Record<string,string>;        // tokens nomeados: bg, ink, inkSoft, muted, accent, line, cardBg...
  brand: { handle; breadcrumb; ctaKeyword; logoGlyph? };  // strings hoje hardcoded ("@JP.ASV", "CLAUDE CODE BR", "hoje")
}
interface FontRole { family; weights:int[]; style:'normal'|'italic'; source:'bundled'|'google'|'upload'; fileRefs }
```
Prisma: `BrandKit` 1–N por `Tenant` (default kit por tenant). Edições **versionam** (`version++`).

### 13.2 Como entra no engine
- `resolveScene(doc, metrics, brandKit)` — os builders dos templates referenciam **papéis** (`display/body/mono/accent`) e **tokens de paleta nomeados**, nunca hex/família literais. Mesma estrutura de template serve qualquer marca.
- **Snapshot + versão**: ao gerar/abrir, o `DesignDocument` guarda `brandKitVersion`. Editar o kit **não** reflui posts antigos silenciosamente; um botão "Atualizar p/ a marca vigente" aplica e re-deriva (mesma filosofia dos overrides §2.7).
- §2.6 (validação de cor) passa a validar contra **a paleta do tenant**; swatches do inspector vêm do kit.

### 13.3 Pipeline dinâmico de fontes (a parte técnica)
Catálogo: **shortlist curada (~20 famílias que funcionam no formato) + busca no catálogo completo do Google Fonts sob demanda**.
- `FontCatalogService`: metadados da shortlist embarcados; busca no Google Fonts API (família, variantes, subsets) sob demanda — só metadados, não os arquivos.
- Ao **selecionar** uma família/peso: baixa os arquivos uma vez (woff2 p/ browser, ttf/otf p/ fontkit+skia), **cacheia os bytes por hash no MinIO**, e serve dos dois runtimes.
- **Registro dual**: browser via `FontFace` (do woff2 cacheado) + `document.fonts.load`; server via `FontLibrary.use()` (skia) + `fontkit.openSync()` (métricas).
- **Determinismo preservado**: ambos leem o **mesmo arquivo cacheado** → métricas idênticas → quebra de linha idêntica (invariante de §3 intacta).
- **Fallback de peso**: se a família não tem o peso pedido (ex.: display 800), usa o mais próximo + loga; auto-fit (§3.3) absorve diferença de largura.
- **Licença**: Google Fonts é OFL/Apache (uso comercial ok); upload manual do tenant exige aceite de licença.

### 13.4 UI
- **Settings → Brand Kit** (por tenant): editor dos 4 papéis (dropdown com shortlist + busca + preview ao vivo no glifo), paleta (swatches editáveis), strings de marca. Preview de um slide-exemplo re-renderizando ao vivo.
- **Gerador**: dropdown de fonte = override rápido de `display`/`body` **para este post** sobre o kit do tenant (persistido em `DesignDocument.typographyOverride`). Default = kit do tenant.
- **Estúdio**: swatches de cor e controles de fonte do inspector leem o kit; fonte por elemento é override fino (fase 2).

---

## 14. Decisões em aberto (com default recomendado)

1. **Backend de canvas no server**: skia-canvas (recomendado, binário) vs node-canvas/Cairo. → skia.
2. **Persistir undo history?** Não no v1 (sessão only). Reavaliar se pedirem colaboração.
3. **Recolorir livre vs paleta travada**: travar à paleta da marca no v1 (validação em `resolveScene`); liberar custom depois.
4. **`GET /contents/:id/scene` server-resolved**: usado como fallback SSR/preview read-only e fonte do worker; client resolve localmente em edição (latência zero). Mantém os dois, mesma função.

---

## Arquivos críticos (resumo)

**Novo pacote**: `packages/scene-engine/**` (§1) · `pnpm-workspace.yaml`.
**Backend modificar**: `render/render.service.ts`, `render/render.processor.ts`, `render/render.config.ts`(novo), `generation/generation.service.ts`, `content/content.controller.ts`, `prisma/schema.prisma`, `package.json`(−playwright +konva +skia-canvas).
**Backend criar**: `generation/prompts/output-schema.ts`, `generation/regenerate.controller.ts`, `content/events.controller.ts`, `uploads/` (presigned/multipart), `modules/images/{image.controller,image.service,image.processor,image-brief}.ts` + `images/providers/{nano-banana,openai,registry}.ts`.
**Frontend criar**: `features/content/studio/{StudioShell,SlideStage,InlineTextEditor,SelectionTransformer,SmartGuides,SlideThumbs,SlideToolbar,RegenerateSlideButton,StudioProgress,SlideImagePanel}.tsx` + `hooks/{useScene,useOverrides,useExportImage,useContentEvents,useUndoRedo,useSlideImage}.ts` + `lib/konva-node-map.ts`. `package.json`(+konva +react-konva).
**Frontend modificar**: `app/(app)/content/[id]/page.tsx`, `app/(app)/content/new/page.tsx`, `wizard/wizard-store.ts`, `wizard/wizard-container.tsx`.
**Brand Kit (novo)** — backend: `modules/brand-kit/{brand-kit.controller,brand-kit.service}.ts`, `modules/fonts/{font-catalog.service,font-cache.service}.ts`, Prisma `BrandKit` + seed. Frontend: `app/(app)/settings/marca/` (editor do kit), `features/brand-kit/{BrandKitEditor,FontRolePicker,PalettePicker,GoogleFontDropdown}.tsx` + `hooks/{useBrandKit,useFontCatalog}.ts`; dropdown de fonte no `wizard/step-theme` (override por post). `scene-engine` ganha `brand-kit.ts`, `fonts/catalog.ts`, `resolveTokens`.
**Frontend deletar (pós-cutover)**: `editor/editor-split-layout.tsx`, `wizard/step-preview.tsx`.
**Reusar**: prompts de geração, `fact-check/`, `content-status-badge`, `publish-dialog`, `step-persona/pattern/theme`, `lib/sanitize`.
