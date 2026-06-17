import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { MinioClient } from '../../database/minio.client';

/**
 * Catálogo + cache de fontes (RFC §13.3), sem exigir API key:
 *  - busca: metadados públicos do Google Fonts (fonts.google.com/metadata/fonts)
 *  - arquivos: CSS API v2 com User-Agent básico → URLs TTF (não woff2)
 *  - cache: bytes salvos UMA vez no MinIO (fonts/<slug>/<peso><i>.ttf) e
 *    servidos pelo proxy público /files — browser (FontFace+fontkit) e server
 *    leem os MESMOS bytes → métricas idênticas → mesma quebra de linha.
 */

export interface FontVariant {
  weight: number;
  italic: boolean;
  key: string;
  url: string;
}

export interface FamilyManifest {
  family: string;
  category?: string;
  variants: FontVariant[];
}

export interface CatalogEntry {
  family: string;
  category: string;
  curated?: boolean;
}

/** shortlist curada — famílias que funcionam bem no formato 1080². */
const SHORTLIST: CatalogEntry[] = [
  { family: 'Plus Jakarta Sans', category: 'sans-serif', curated: true },
  { family: 'Inter', category: 'sans-serif', curated: true },
  { family: 'Manrope', category: 'sans-serif', curated: true },
  { family: 'Montserrat', category: 'sans-serif', curated: true },
  { family: 'Poppins', category: 'sans-serif', curated: true },
  { family: 'DM Sans', category: 'sans-serif', curated: true },
  { family: 'Work Sans', category: 'sans-serif', curated: true },
  { family: 'Archivo', category: 'sans-serif', curated: true },
  { family: 'Space Grotesk', category: 'sans-serif', curated: true },
  { family: 'Bebas Neue', category: 'display', curated: true },
  { family: 'DM Serif Display', category: 'serif', curated: true },
  { family: 'Playfair Display', category: 'serif', curated: true },
  { family: 'Lora', category: 'serif', curated: true },
  { family: 'Merriweather', category: 'serif', curated: true },
  { family: 'Libre Baskerville', category: 'serif', curated: true },
  { family: 'Crimson Text', category: 'serif', curated: true },
  { family: 'JetBrains Mono', category: 'monospace', curated: true },
  { family: 'IBM Plex Mono', category: 'monospace', curated: true },
  { family: 'Fira Code', category: 'monospace', curated: true },
  { family: 'Space Mono', category: 'monospace', curated: true },
];

const METADATA_URL = 'https://fonts.google.com/metadata/fonts';
const CSS2_URL = 'https://fonts.googleapis.com/css2';
// UA sem suporte a woff2 → o Google responde com TTF (que fontkit/skia leem)
const TTF_UA = 'Mozilla/5.0 (compatible; PublisherFonts/1.0)';
const WANTED_WEIGHTS = [400, 500, 600, 700, 800];

const slug = (family: string) => family.toLowerCase().replace(/[^a-z0-9]+/g, '-');

@Injectable()
export class FontCatalogService {
  private readonly logger = new Logger(FontCatalogService.name);
  /** metadados completos (família → {category, pesos, temItalico}), carregado 1x. */
  private catalog: Map<string, { category: string; weights: number[]; italic: boolean }> | null = null;
  private readonly manifests = new Map<string, FamilyManifest>();

  constructor(private readonly minio: MinioClient) {}

  /** shortlist + busca textual no catálogo completo (quando disponível). */
  async search(q?: string): Promise<{ shortlist: CatalogEntry[]; results: CatalogEntry[] }> {
    if (!q?.trim()) return { shortlist: SHORTLIST, results: [] };
    const needle = q.trim().toLowerCase();
    const cat = await this.loadCatalog();
    const results: CatalogEntry[] = [];
    if (cat) {
      for (const [family, meta] of cat) {
        if (family.toLowerCase().includes(needle)) {
          results.push({ family, category: meta.category });
          if (results.length >= 20) break;
        }
      }
    } else {
      results.push(...SHORTLIST.filter((s) => s.family.toLowerCase().includes(needle)));
    }
    return { shortlist: SHORTLIST, results };
  }

  /** garante a família cacheada no MinIO e devolve o manifest de variantes. */
  async ensureFamily(family: string): Promise<FamilyManifest> {
    const cached = this.manifests.get(family);
    if (cached) return cached;

    const cat = await this.loadCatalog();
    const meta = cat?.get(family);
    const weights = (meta?.weights ?? WANTED_WEIGHTS).filter((w) => WANTED_WEIGHTS.includes(w));
    const useWeights = weights.length ? weights : [400];
    const withItalic = meta?.italic ?? true;

    const faces = await this.fetchCss2Faces(family, useWeights, withItalic);
    if (!faces.length) throw new BadRequestException(`Família "${family}" não encontrada no Google Fonts`);

    const variants: FontVariant[] = [];
    for (const face of faces) {
      const key = `fonts/${slug(family)}/${face.weight}${face.italic ? 'i' : ''}.ttf`;
      if (!(await this.exists(key))) {
        const res = await fetch(face.src);
        if (!res.ok) {
          this.logger.warn(`Falha ao baixar ${face.src}: ${res.status}`);
          continue;
        }
        const buf = Buffer.from(await res.arrayBuffer());
        await this.minio.putBuffer(key, buf, 'font/ttf');
        this.logger.log(`Fonte cacheada: ${key} (${Math.round(buf.length / 1024)}KB)`);
      }
      variants.push({ weight: face.weight, italic: face.italic, key, url: this.minio.publicUrl(key) });
    }
    if (!variants.length) throw new BadRequestException(`Nenhuma variante baixada para "${family}"`);

    const manifest: FamilyManifest = { family, category: meta?.category, variants };
    this.manifests.set(family, manifest);
    return manifest;
  }

  // ---- internos ----

  private async loadCatalog() {
    if (this.catalog) return this.catalog;
    try {
      const res = await fetch(METADATA_URL);
      const raw = await res.text();
      const json = JSON.parse(raw.replace(/^\)\]\}'/, ''));
      const map = new Map<string, { category: string; weights: number[]; italic: boolean }>();
      for (const f of json.familyMetadataList ?? []) {
        const keys = Object.keys(f.fonts ?? {});
        const weights = [...new Set(keys.map((k) => parseInt(k, 10)).filter((n) => !Number.isNaN(n)))];
        const italic = keys.some((k) => k.endsWith('i'));
        map.set(f.family, { category: (f.category ?? 'sans-serif').toLowerCase(), weights, italic });
      }
      this.catalog = map;
      this.logger.log(`Catálogo Google Fonts carregado: ${map.size} famílias`);
    } catch (e) {
      this.logger.warn(`Catálogo Google indisponível (${(e as Error).message}); usando shortlist`);
      this.catalog = null;
    }
    return this.catalog;
  }

  /** css2 → lista de @font-face {weight, italic, src(ttf)}. */
  private async fetchCss2Faces(
    family: string,
    weights: number[],
    italic: boolean,
  ): Promise<Array<{ weight: number; italic: boolean; src: string }>> {
    const spec = italic
      ? `ital,wght@${[...weights.map((w) => `0,${w}`), '1,400'].join(';')}`
      : `wght@${weights.join(';')}`;
    const url = `${CSS2_URL}?family=${encodeURIComponent(family)}:${spec}&display=swap`;
    let res = await fetch(url, { headers: { 'User-Agent': TTF_UA } });
    if (!res.ok && italic) {
      // família sem itálico → re-tenta só com os pesos
      res = await fetch(`${CSS2_URL}?family=${encodeURIComponent(family)}:wght@${weights.join(';')}&display=swap`, {
        headers: { 'User-Agent': TTF_UA },
      });
    }
    if (!res.ok) return [];
    const css = await res.text();

    const faces: Array<{ weight: number; italic: boolean; src: string }> = [];
    for (const block of css.match(/@font-face\s*{[^}]*}/g) ?? []) {
      const style = /font-style:\s*(normal|italic)/.exec(block)?.[1] ?? 'normal';
      const weight = parseInt(/font-weight:\s*(\d+)/.exec(block)?.[1] ?? '400', 10);
      const src = /url\((https:[^)]+)\)/.exec(block)?.[1];
      // css2 repete blocos por unicode-range; mantém só o primeiro por (peso, estilo)
      if (src && !faces.some((f) => f.weight === weight && f.italic === (style === 'italic'))) {
        faces.push({ weight, italic: style === 'italic', src });
      }
    }
    return faces;
  }

  private async exists(key: string): Promise<boolean> {
    try {
      const obj = await this.minio.getObject(key);
      obj.body.destroy();
      return true;
    } catch {
      return false;
    }
  }
}
