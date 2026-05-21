export const CAROUSEL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

:root{
  --cream:#F2EBE0;
  --cream-2:#E8E0D2;
  --cream-rose:#EBDAC8;
  --ink:#1A1815;
  --ink-soft:#3A3530;
  --muted:#8A8275;
  --orange:#C7634F;
  --orange-soft:#D9785F;
  --line:#C9BFA9;
}

*{box-sizing:border-box;margin:0;padding:0}
body{background:#181715;padding:48px 24px;font-family:'Plus Jakarta Sans',-apple-system,sans-serif}

.gallery{display:grid;grid-template-columns:repeat(auto-fill,640px);gap:32px;justify-content:center;max-width:100%}

.slide{
  width:1080px;height:1080px;
  background:var(--cream);
  color:var(--ink);
  padding:88px 96px;
  position:relative;
  display:flex;flex-direction:column;
  overflow:hidden;
  border-radius:6px;
  box-shadow:0 8px 32px rgba(0,0,0,0.4);
  transform:scale(0.5926);
  transform-origin:top left;
  margin-bottom:-440px;
  margin-right:-440px;
}

/* Cantos com colchetes */
.slide:before, .slide:after,
.slide .corners:before, .slide .corners:after{
  content:"";position:absolute;width:36px;height:36px;
  border-color:var(--ink);border-style:solid;border-width:0;
}
.slide:before{top:32px;left:32px;border-top-width:1.5px;border-left-width:1.5px}
.slide:after{top:32px;right:32px;border-top-width:1.5px;border-right-width:1.5px}
.slide .corners:before{bottom:32px;left:32px;border-bottom-width:1.5px;border-left-width:1.5px}
.slide .corners:after{bottom:32px;right:32px;border-bottom-width:1.5px;border-right-width:1.5px}

/* Numero fantasma grande no fundo */
.bg-num{
  position:absolute;
  top:96px;right:104px;
  font-family:'DM Serif Display',Georgia,serif;
  font-style:italic;
  font-size:280px;
  line-height:0.85;
  color:var(--orange);
  opacity:0.10;
  pointer-events:none;
  user-select:none;
}

/* TOPBAR */
.topbar{
  display:flex;align-items:center;justify-content:space-between;
  font-family:'JetBrains Mono',monospace;
  font-size:18px;
  letter-spacing:0.10em;
  color:var(--muted);
  text-transform:uppercase;
  z-index:2;
}
.topbar .step-label{
  font-family:'Plus Jakarta Sans',sans-serif;
  font-weight:600;
  font-size:18px;
  letter-spacing:0.16em;
  color:var(--orange);
  text-transform:uppercase;
}
.topbar .pageno{color:var(--ink);font-weight:600;font-size:16px}

/* CONTENT */
.content{margin-top:48px;flex:1;display:flex;flex-direction:column;z-index:2}

/* HEADLINE — sans pesada + serif italic coral mista */
.headline{
  font-family:'Plus Jakarta Sans',sans-serif;
  font-weight:800;
  font-size:78px;
  line-height:1.04;
  letter-spacing:-0.025em;
  color:var(--ink);
}
.headline .em, .headline em{
  font-family:'DM Serif Display',Georgia,serif;
  font-weight:400;
  font-style:italic;
  color:var(--orange);
  letter-spacing:-0.02em;
}
.headline .strong{font-weight:800;color:var(--ink)}
.headline .ink{color:var(--ink)}

/* Underline coral abaixo da headline */
.underline{
  width:96px;height:4px;
  background:var(--orange);
  margin-top:36px;
  border-radius:2px;
}

/* CAPA — variacao com asterisco grande */
.slide.cover{padding:88px 96px;justify-content:flex-start}
.slide.cover .label{
  font-family:'Plus Jakarta Sans',sans-serif;
  font-weight:600;
  font-size:20px;
  letter-spacing:0.18em;
  color:var(--orange);
  text-transform:uppercase;
  margin-bottom:32px;
}
.slide.cover .asterisk{
  font-family:'DM Serif Display',serif;
  font-size:96px;
  line-height:1;
  color:var(--orange);
  margin-bottom:24px;
  display:block;
}
.slide.cover .headline{font-size:78px;line-height:1.04;letter-spacing:-0.025em}
.slide.cover .headline em,.slide.cover .headline .em{font-size:0.96em;letter-spacing:-0.02em}
.slide.cover .footer-tags{
  margin-top:auto;
  font-family:'Plus Jakarta Sans',sans-serif;
  font-weight:600;
  font-size:18px;
  letter-spacing:0.16em;
  color:var(--orange);
  text-transform:uppercase;
}

/* BULLETS coloridos */
.bullets{list-style:none;margin-top:36px;display:flex;flex-direction:column;gap:24px}
.bullets li{
  font-family:'Plus Jakarta Sans',sans-serif;
  font-size:34px;
  line-height:1.32;
  color:var(--ink-soft);
  padding-left:42px;
  position:relative;
  letter-spacing:-0.005em;
}
.bullets li:before{
  content:"\\25CF";
  position:absolute;left:0;top:2px;
  color:var(--orange);
  font-size:18px;
  line-height:1.6;
}
.bullets li strong{font-weight:700;color:var(--ink)}
.bullets li em{
  font-family:'DM Serif Display',Georgia,serif;
  font-style:italic;
  color:var(--orange);
  font-weight:400;
}
.bullets li code,.bullets li .cmd{
  font-family:'JetBrains Mono',monospace;
  font-weight:500;
  background:transparent;
  color:var(--orange);
  font-size:0.94em;
  padding:0 2px;
}

/* CARDS 2x2 */
.cards-grid{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:24px;
  margin-top:32px;
}
.card{
  background:#FAF6ED;
  border:1px solid var(--line);
  border-radius:10px;
  padding:32px 28px;
  display:flex;flex-direction:column;
  position:relative;
}
.card.highlight{
  background:var(--cream-rose);
  border-color:var(--orange);
}
.card-label{
  font-family:'JetBrains Mono',monospace;
  font-size:16px;
  letter-spacing:0.16em;
  color:var(--muted);
  text-transform:uppercase;
  margin-bottom:14px;
  font-weight:500;
}
.card.highlight .card-label{color:var(--orange)}
.card-title{
  font-family:'Plus Jakarta Sans',sans-serif;
  font-weight:800;
  font-size:38px;
  letter-spacing:-0.02em;
  color:var(--ink);
  margin-bottom:14px;
  display:flex;align-items:center;gap:14px;
}
.card-title .icon{font-size:34px}
.card-body{
  font-family:'Plus Jakarta Sans',sans-serif;
  font-size:22px;
  line-height:1.32;
  color:var(--ink-soft);
}
.card-body em,.card-body .em{
  font-family:'DM Serif Display',serif;
  font-style:italic;
  color:var(--orange);
  font-weight:400;
}

/* CALLOUT BOX (destaque embaixo) */
.callout{
  margin-top:auto;
  background:var(--cream-rose);
  border-radius:10px;
  padding:28px 32px;
  font-family:'Plus Jakarta Sans',sans-serif;
  font-size:28px;
  line-height:1.32;
  color:var(--ink);
  font-weight:500;
  letter-spacing:-0.005em;
}
.callout .hl{color:var(--orange);font-weight:600}
.callout em{
  font-family:'DM Serif Display',serif;
  font-style:italic;
  color:var(--orange);
  font-weight:400;
}

/* STATS (compatibilidade slides antigos com stats) */
.stats-list{display:flex;flex-direction:column;gap:20px;margin-top:36px}
.stat-row{
  display:flex;align-items:baseline;gap:32px;
  padding-bottom:22px;
  border-bottom:1px solid var(--line);
}
.stat-row:last-child{border-bottom:none}
.stat-num{
  font-family:'DM Serif Display',Georgia,serif;
  font-style:italic;
  font-size:58px;
  font-weight:400;
  color:var(--orange);
  flex-shrink:0;
  width:380px;
  line-height:1.05;
  letter-spacing:-0.02em;
}
.stat-text{
  font-family:'Plus Jakarta Sans',sans-serif;
  font-size:30px;
  line-height:1.28;
  color:var(--ink);
  font-weight:500;
}

/* FOOTER */
.footer{
  margin-top:32px;
  padding-top:28px;
  border-top:1px solid var(--line);
  display:flex;justify-content:space-between;align-items:center;
  font-family:'JetBrains Mono',monospace;
  font-size:15px;
  letter-spacing:0.12em;
  color:var(--muted);
  text-transform:uppercase;
  z-index:2;
}
.footer .handle{color:var(--ink);font-weight:600}
.footer .breadcrumb{color:var(--muted)}

/* Cover specific footer */
.slide.cover .footer{margin-top:24px}

/* CTA SLIDE — fundo coral, asterisco, mesma vibe */
.slide.cta{background:var(--orange);color:var(--cream)}
.slide.cta:before,.slide.cta:after,
.slide.cta .corners:before,.slide.cta .corners:after{border-color:var(--cream)}
.slide.cta .topbar{color:rgba(242,235,224,0.7)}
.slide.cta .topbar .step-label{color:var(--cream)}
.slide.cta .topbar .pageno{color:var(--cream)}
.slide.cta .label{
  font-family:'Plus Jakarta Sans',sans-serif;
  font-weight:600;
  font-size:18px;
  letter-spacing:0.18em;
  color:rgba(242,235,224,0.85);
  text-transform:uppercase;
  margin-bottom:32px;
}
.slide.cta .asterisk{color:var(--cream);opacity:0.85;font-size:80px;margin-bottom:20px;font-family:'DM Serif Display',serif;line-height:1;display:block}
.slide.cta .headline{font-size:62px;color:var(--cream);line-height:1.08;letter-spacing:-0.02em}
.slide.cta .headline em,.slide.cta .headline .em{color:var(--cream);font-style:italic}
.slide.cta .headline .strong{color:var(--cream);font-weight:800}
.slide.cta .keyword{
  display:inline-block;
  background:var(--ink);color:var(--cream);
  padding:4px 16px;border-radius:5px;
  font-family:'JetBrains Mono',monospace;
  font-size:0.78em;
  margin:0 4px;
  letter-spacing:0.04em;
  font-weight:500;
  vertical-align:middle;
}
.slide.cta .underline{background:var(--cream);opacity:0.9;margin-top:28px}
.slide.cta .cta-sub{
  font-family:'Plus Jakarta Sans',sans-serif;
  font-size:26px;
  line-height:1.32;
  color:rgba(242,235,224,0.85);
  margin-top:28px;
  font-weight:400;
}
.slide.cta .footer{border-top:1px solid rgba(242,235,224,0.35);color:rgba(242,235,224,0.85)}
.slide.cta .footer .handle{color:var(--cream)}
.slide.cta .footer .breadcrumb{color:rgba(242,235,224,0.85)}

/* ============================
   TEMPLATE COMPENDIUM (Hina Arora style)
   Capa serif italic centralizada + slides com box preto terminal
   ============================ */
.slide.compendium{
  background:#FAF6EE;
  padding:96px 100px;
  align-items:center;
  text-align:center;
}
.slide.compendium:before,.slide.compendium:after,
.slide.compendium .corners:before,.slide.compendium .corners:after{display:none}

.slide.compendium .author-top{
  font-family:'DM Serif Display',Georgia,serif;
  font-style:italic;
  font-size:24px;
  color:var(--ink);
  text-align:center;
  width:100%;
  margin-bottom:48px;
}
.slide.compendium .comp-headline{
  font-family:'DM Serif Display',Georgia,serif;
  font-style:italic;
  font-weight:400;
  font-size:88px;
  line-height:1.04;
  letter-spacing:-0.02em;
  color:var(--ink);
  text-align:center;
  display:inline-block;
  position:relative;
  padding:0 12px;
}
.slide.compendium .comp-headline .em{color:var(--orange);font-style:italic}
.slide.compendium .comp-headline .ink{color:var(--ink);font-style:italic}
.slide.compendium .comp-headline .ast{
  display:inline-block;
  color:var(--orange);
  font-size:0.5em;
  vertical-align:0.45em;
  margin:0 4px;
}
.slide.compendium .underline{
  width:120px;height:3px;
  background:var(--orange);
  margin:24px auto 56px;
  border-radius:2px;
}

/* Box terminal preto com lista de comandos */
.slide.compendium .terminal{
  background:#1F1D1A;
  border-radius:18px;
  padding:48px 56px 40px;
  width:100%;
  max-width:880px;
  margin:0 auto;
  box-shadow:0 8px 28px rgba(0,0,0,0.18);
  text-align:left;
  position:relative;
  display:flex;flex-direction:column;
  flex:1;
}
.slide.compendium .terminal .term-list{
  font-family:'JetBrains Mono',monospace;
  font-size:32px;
  line-height:1.55;
  color:#E5DFD0;
  font-weight:400;
  letter-spacing:0;
}
.slide.compendium .terminal .term-list .cmd{color:#E5DFD0;font-weight:500}
.slide.compendium .terminal .term-list .desc{color:#9C9586}
.slide.compendium .terminal .term-list .em{color:var(--orange);font-style:italic;font-family:'DM Serif Display',serif}
.slide.compendium .terminal .term-list strong{color:#FFF;font-weight:600}
.slide.compendium .terminal .term-list br{line-height:1.55}
.slide.compendium .terminal .term-list .row{padding:2px 0;display:block}

.slide.compendium .terminal .term-footer{
  margin-top:auto;
  padding-top:32px;
  display:flex;align-items:center;justify-content:space-between;
  border-top:1px solid rgba(229,223,208,0.12);
  margin-top:32px;
  padding-top:24px;
}
.slide.compendium .terminal .plus{
  width:42px;height:42px;
  border-radius:50%;
  background:#2D2A26;
  color:#9C9586;
  display:flex;align-items:center;justify-content:center;
  font-size:24px;font-weight:300;
  border:1px solid #3A3631;
}
.slide.compendium .terminal .model-pill{
  font-family:'Plus Jakarta Sans',sans-serif;
  font-size:18px;
  color:#9C9586;
  letter-spacing:0.02em;
  margin-right:auto;
  margin-left:24px;
}
.slide.compendium .terminal .send-btn{
  width:42px;height:42px;
  border-radius:50%;
  background:var(--orange);
  color:#FFF;
  display:flex;align-items:center;justify-content:center;
  font-size:22px;font-weight:600;
}

/* Footer simples */
.slide.compendium .comp-footer{
  margin-top:36px;
  font-family:'JetBrains Mono',monospace;
  font-size:14px;
  letter-spacing:0.18em;
  color:var(--muted);
  text-transform:uppercase;
  text-align:center;
  width:100%;
}
.slide.compendium .pageno-comp{
  position:absolute;top:48px;right:60px;
  font-family:'JetBrains Mono',monospace;
  font-size:15px;
  color:var(--muted);
  letter-spacing:0.12em;
}

/* CAPA compendium */
.slide.compendium-cover{
  background:#FAF6EE;
  display:flex;align-items:center;justify-content:center;
  padding:120px 96px;
  text-align:center;
  position:relative;
  overflow:hidden;
}
.slide.compendium-cover .bg-asterisk{
  position:absolute;
  bottom:-40px;left:-40px;
  font-family:'DM Serif Display',serif;
  font-size:340px;
  color:var(--orange);
  opacity:0.18;
  pointer-events:none;
  line-height:1;
  user-select:none;
}
.slide.compendium-cover .cover-title{
  font-family:'DM Serif Display',Georgia,serif;
  font-style:italic;
  font-weight:400;
  font-size:108px;
  line-height:1.08;
  letter-spacing:-0.025em;
  color:var(--ink);
  position:relative;
  z-index:2;
}
.slide.compendium-cover .cover-title .em{color:var(--orange);font-style:italic}
.slide.compendium-cover .cover-title .ast{
  display:inline-block;
  color:var(--orange);
  font-size:0.7em;
  vertical-align:0.18em;
  margin-right:12px;
  font-family:'DM Serif Display',serif;
}
.slide.compendium-cover .cover-author{
  font-family:'DM Serif Display',serif;
  font-style:italic;
  font-size:26px;
  color:var(--ink);
  margin-top:80px;
  position:relative;
  z-index:2;
}
.slide.compendium-cover .pageno-comp{color:var(--muted)}

/* CTA compendium */
.slide.compendium-cta{
  background:#FAF6EE;
  padding:96px 100px;
  text-align:center;
  align-items:center;
  justify-content:center;
}
.slide.compendium-cta .author-top{
  font-family:'DM Serif Display',serif;
  font-style:italic;
  font-size:24px;
  color:var(--ink);
  margin-bottom:48px;
}
.slide.compendium-cta .caps-headline{
  font-family:'DM Serif Display',serif;
  font-weight:400;
  font-style:normal;
  font-size:64px;
  line-height:1.16;
  letter-spacing:-0.01em;
  color:var(--ink);
  text-transform:uppercase;
  text-align:center;
  margin-bottom:0;
}
.slide.compendium-cta .underline{margin:24px auto 56px;width:160px}
.slide.compendium-cta .square-mark{
  width:96px;height:96px;
  background:var(--orange);
  border-radius:14px;
  display:flex;align-items:center;justify-content:center;
  margin:0 auto 40px;
  font-family:'DM Serif Display',serif;
  font-size:56px;
  color:#FFF;
}
.slide.compendium-cta .cta-call{
  font-family:'Plus Jakarta Sans',sans-serif;
  font-weight:700;
  font-size:34px;
  line-height:1.32;
  color:var(--ink);
  margin-bottom:48px;
  letter-spacing:-0.01em;
}
.slide.compendium-cta .cta-call .keyword{
  display:inline-block;
  background:var(--ink);color:var(--cream);
  padding:4px 14px;border-radius:5px;
  font-family:'JetBrains Mono',monospace;
  font-size:0.78em;
  letter-spacing:0.04em;
  font-weight:500;
  vertical-align:middle;
}
.slide.compendium-cta .flag-bullets{
  list-style:none;
  text-align:left;
  max-width:700px;
  margin:0 auto;
  display:flex;flex-direction:column;
  gap:18px;
}
.slide.compendium-cta .flag-bullets li{
  font-family:'Plus Jakarta Sans',sans-serif;
  font-size:24px;
  line-height:1.36;
  color:var(--ink-soft);
  padding-left:48px;
  position:relative;
}
.slide.compendium-cta .flag-bullets li:before{
  content:"\\2691";
  position:absolute;left:0;top:0;
  color:var(--orange);
  font-size:28px;
}
`;
