import { CAROUSEL_CSS } from './template-engine.css';
import { CarouselInput, SlideInput, RenderOutput } from './types';

/**
 * STEP 01, STEP 02...
 */
function stepLabel(idx: number): string {
  return `STEP ${String(idx).padStart(2, '0')}`;
}

/**
 * Render cover slide (step template).
 * Python: render_cover() lines 650-673
 */
export function renderCover(data: CarouselInput): string {
  const label = data.label_capa ?? '';
  const hook = data.hook_capa ?? '';
  const labelTopo = data.label_topo_capa ?? 'CLAUDE CODE';

  return `
  <div class="slide cover">
    <div class="corners"></div>
    <div class="topbar">
      <span class="step-label">${labelTopo}</span>
      <span class="pageno">01 / 06</span>
    </div>
    <div class="content">
      <span class="asterisk">✻</span>
      <div class="label">${label}</div>
      <h1 class="headline">${hook}</h1>
      <div class="underline"></div>
      <div class="footer-tags">5 PASSOS · TÉCNICO · SEM CÓDIGO</div>
    </div>
    <div class="footer">
      <span class="breadcrumb">@JP.ASV · CLAUDE CODE BR</span>
      <span class="handle">ARRASTA →</span>
    </div>
  </div>
`;
}

/**
 * Render a body slide (step template).
 * Python: render_slide_step() lines 676-785
 */
export function renderSlideStep(slide: SlideInput, page: number): string {
  const labelTopo = slide.label_topo ?? stepLabel(page);

  // Se label_topo ja contem "---" tipo "02 --- onde o cliente erra", separa o titulo
  let titleAfter = '';
  if (labelTopo.includes('—')) {
    // em-dash
    const parts = labelTopo.split('—');
    titleAfter = (parts[1] ?? '').trim();
  } else if (labelTopo.includes('-') && !labelTopo.startsWith('STEP')) {
    const parts = labelTopo.split('-', 2);
    if (parts.length === 2) {
      titleAfter = parts[1].trim();
    }
  }

  // Headline para esse slide
  let headlineHtml = '';
  if (slide.headline_top || slide.headline_em || slide.headline_bottom) {
    const top = (slide.headline_top ?? '').trim();
    const em = (slide.headline_em ?? '').trim();
    const bottom = (slide.headline_bottom ?? '').trim();
    const parts: string[] = [];
    if (top) {
      parts.push(`<span class="ink">${top} </span>`);
    }
    if (em) {
      parts.push(`<span class="em">${em}</span>`);
    }
    if (bottom) {
      parts.push(`<br/><span class="ink">${bottom}</span>`);
    }
    headlineHtml = `<h1 class="headline">${parts.join('')}</h1>`;
  } else if (titleAfter) {
    // Tenta achar uma palavra com italico no titleAfter via regex
    const m = /\*([^*]+)\*/.exec(titleAfter);
    if (m) {
      const pre = titleAfter.slice(0, m.index);
      const mid = m[1];
      const post = titleAfter.slice(m.index + m[0].length);
      headlineHtml =
        `<h1 class="headline"><span class="ink">${pre}</span>` +
        `<span class="em">${mid}</span>` +
        `<span class="ink">${post}</span></h1>`;
    } else {
      // fallback: capitaliza primeira letra e mostra como headline
      const t = titleAfter.trim().charAt(0).toUpperCase() + titleAfter.trim().slice(1);
      headlineHtml = `<h1 class="headline"><span class="ink">${t}</span></h1>`;
    }
  }

  let kickerHtml = '';
  if (slide.tag) {
    kickerHtml = `<div class="label" style="font-family:'Plus Jakarta Sans';font-weight:600;font-size:18px;letter-spacing:0.18em;color:var(--orange);text-transform:uppercase;margin-bottom:24px">${slide.tag}</div>`;
  }

  // Body
  let bodyHtml = '';
  if (slide.cards) {
    const cardsParts = slide.cards.map((c) => {
      const cls = c.highlight ? 'card highlight' : 'card';
      const label = c.label ?? '';
      const icon = c.icon ?? '';
      const title = c.title ?? '';
      const body = c.body ?? '';
      const iconHtml = icon ? `<span class="icon">${icon}</span>` : '';
      return (
        `<div class="${cls}">` +
        `<span class="card-label">${label}</span>` +
        `<h3 class="card-title">${iconHtml}${title}</h3>` +
        `<p class="card-body">${body}</p>` +
        `</div>`
      );
    });
    bodyHtml = `<div class="cards-grid">${cardsParts.join('')}</div>`;
  } else if (slide.list) {
    const items = slide.list.map((i) => `<li>${i}</li>`).join('');
    bodyHtml = `<ul class="bullets">${items}</ul>`;
  } else if (slide.stats) {
    const rows = slide.stats
      .map(
        ([n, t]) =>
          `<div class="stat-row"><div class="stat-num">${n}</div><div class="stat-text">${t}</div></div>`,
      )
      .join('');
    bodyHtml = `<div class="stats-list">${rows}</div>`;
  } else if (slide.paragraphs) {
    // Cada paragrafo vira um bullet (mais visual)
    const items = slide.paragraphs.map((p) => `<li>${p}</li>`).join('');
    bodyHtml = `<ul class="bullets">${items}</ul>`;
  }

  let calloutHtml = '';
  if (slide.callout) {
    calloutHtml = `<div class="callout">${slide.callout}</div>`;
  }

  const bgNumHtml = `<span class="bg-num">${String(page).padStart(2, '0')}</span>`;
  const stepNum = String(page - 1).padStart(2, '0');
  const pageNum = String(page).padStart(2, '0');

  return `
  <div class="slide step">
    <div class="corners"></div>
    ${bgNumHtml}
    <div class="topbar">
      <span class="step-label">STEP ${stepNum}</span>
      <span class="pageno">${pageNum} / 06</span>
    </div>
    <div class="content">
      ${kickerHtml}
      ${headlineHtml}
      <div class="underline"></div>
      ${bodyHtml}
      ${calloutHtml}
    </div>
    <div class="footer">
      <span class="breadcrumb">@JP.ASV · CLAUDE CODE BR</span>
      <span class="handle">ARRASTA →</span>
    </div>
  </div>
`;
}

/**
 * Render CTA slide (step template).
 * Python: render_cta() lines 788-808
 */
export function renderCta(data: CarouselInput): string {
  return `
  <div class="slide cta">
    <div class="corners"></div>
    <div class="topbar">
      <span class="step-label">${(data.cta_label_topo ?? 'TÁ NA HORA').toUpperCase()}</span>
      <span class="pageno">06 / 06</span>
    </div>
    <div class="content">
      <span class="asterisk">✻</span>
      <div class="label">${data.cta_label ?? 'leva 2 minutos pra colar'}</div>
      <h1 class="headline">${data.cta_text ?? ''}</h1>
      <div class="underline"></div>
      <p class="cta-sub">${data.cta_sub ?? 'Sem te cobrar nada.'}</p>
    </div>
    <div class="footer">
      <span class="breadcrumb">@JP.ASV · CLAUDE CODE BR</span>
      <span class="handle">👇 COMENTA AÍ</span>
    </div>
  </div>
`;
}

/**
 * Render compendium cover slide.
 * Python: render_compendium_cover() lines 811-826
 */
export function renderCompendiumCover(data: CarouselInput): string {
  let hook = data.hook_capa ?? '';
  // Substitui <em>X</em> por <span class="em">X</span>
  hook = hook.replace(/<em>(.*?)<\/em>/g, '<span class="em">$1</span>');
  // Substitui <span class="strong">X</span> por <span class="ink">X</span>
  hook = hook.replace(/<span class="strong">(.*?)<\/span>/g, '<span class="ink">$1</span>');

  return `
  <div class="slide compendium-cover">
    <span class="bg-asterisk">✻</span>
    <span class="pageno-comp">01 / 06</span>
    <h1 class="cover-title">
      <span class="ast">✻</span>${hook}
    </h1>
    <div class="cover-author">@jp.asv</div>
  </div>
`;
}

/**
 * Render compendium body slide.
 * Python: render_compendium_slide() lines 829-876
 */
export function renderCompendiumSlide(slide: SlideInput, page: number): string {
  // Headline curta: usa o "tag" se existir, ou label_topo apos "---"
  let titleAfter = '';
  const labelTopo = slide.label_topo ?? '';
  if (labelTopo.includes('—')) {
    const parts = labelTopo.split('—');
    titleAfter = (parts[1] ?? '').trim();
  }

  let headlineText = (slide.tag ?? (titleAfter || 'Como funciona')).trim();
  // Capitalize first letter; se tiver "/" mantem
  if (headlineText && headlineText[0] === headlineText[0].toLowerCase() && headlineText[0] !== headlineText[0].toUpperCase()) {
    headlineText = headlineText[0].toUpperCase() + headlineText.slice(1);
  }

  // Conteudo do terminal box
  let rowsHtml = '';
  if (slide.list) {
    rowsHtml = slide.list.map((item) => `<span class="row">${item}</span>`).join('');
  } else if (slide.paragraphs) {
    rowsHtml = slide.paragraphs.map((p) => `<span class="row">${p}</span>`).join('');
  } else if (slide.stats) {
    rowsHtml = slide.stats
      .map(([n, t]) => `<span class="row"><span class="em">${n}</span> — ${t}</span>`)
      .join('');
  } else if (slide.cards) {
    rowsHtml = slide.cards
      .map((c) => `<span class="row"><strong>${c.title ?? ''}</strong> — ${c.body ?? ''}</span>`)
      .join('');
  }

  const pageNum = String(page).padStart(2, '0');

  return `
  <div class="slide compendium">
    <span class="pageno-comp">${pageNum} / 06</span>
    <div class="author-top">@jp.asv</div>
    <h1 class="comp-headline"><span class="ink">${headlineText}</span><span class="ast">✻</span></h1>
    <div class="underline"></div>
    <div class="terminal">
      <div class="term-list">${rowsHtml}</div>
      <div class="term-footer">
        <span class="plus">+</span>
        <span class="model-pill">Sonnet 4.6 ⌄</span>
        <span class="send-btn">↑</span>
      </div>
    </div>
    <div class="comp-footer">CLAUDE CODE BR · @JP.ASV</div>
  </div>
`;
}

/**
 * Render compendium CTA slide.
 * Python: render_compendium_cta() lines 879-899
 */
export function renderCompendiumCta(data: CarouselInput): string {
  const keyword = 'hoje';
  const ctaCall =
    `Comenta <span class="keyword">${keyword}</span> pra receber o link da ` +
    `<strong>aula gratuita</strong> de Claude Code.`;

  return `
  <div class="slide compendium-cta">
    <span class="pageno-comp">06 / 06</span>
    <div class="author-top">@jp.asv</div>
    <h1 class="caps-headline">SE VOCÊ USAR ISSO DIREITO,<br/>NÃO PRECISA DE "PROMPT MÁGICO".</h1>
    <div class="underline"></div>
    <div class="square-mark">✻</div>
    <p class="cta-call">${ctaCall}</p>
    <ul class="flag-bullets">
      <li>Salva esse post pra acessar quando precisar.</li>
      <li>Conhece um contador que ainda escritura nota a nota? Manda pra ele.</li>
    </ul>
  </div>
`;
}

/**
 * Orchestrator: selects template family, loops slides, wraps in HTML document.
 * Python: render() lines 902-928
 */
export function renderCarousel(data: CarouselInput): RenderOutput {
  const template = data.template ?? 'step';
  let slidesHtml = '';
  let slideCount = 0;

  if (template === 'compendium') {
    slidesHtml = renderCompendiumCover(data);
    slideCount = 1;
    for (let i = 0; i < data.slides.length; i++) {
      slidesHtml += renderCompendiumSlide(data.slides[i], i + 2);
      slideCount++;
    }
    slidesHtml += renderCompendiumCta(data);
    slideCount++;
  } else {
    slidesHtml = renderCover(data);
    slideCount = 1;
    for (let i = 0; i < data.slides.length; i++) {
      slidesHtml += renderSlideStep(data.slides[i], i + 2);
      slideCount++;
    }
    slidesHtml += renderCta(data);
    slideCount++;
  }

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>Carrossel — ${data.slug ?? ''}</title>
<style>${CAROUSEL_CSS}</style>
</head>
<body>
<div class="gallery">
${slidesHtml}
</div>
</body>
</html>
`;

  return { html, slideCount };
}
