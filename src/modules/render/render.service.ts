import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { MinioClient } from '../../database/minio.client';
import { renderCarousel } from './template-engine';
import { carouselToDoc } from './carousel-to-doc';
import { CarouselInput, RenderResult } from './types';
import { v4 as uuid } from 'uuid';

@Injectable()
export class RenderService {
  private readonly logger = new Logger(RenderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioClient,
    @InjectQueue('render') private readonly renderQueue: Queue,
  ) {}

  async enqueueRender(contentId: string) {
    const renderJob = await this.prisma.renderJob.create({
      data: { contentId, status: 'PENDING' },
    });

    const job = await this.renderQueue.add('render-content', {
      contentId,
      renderJobId: renderJob.id,
    });

    await this.prisma.renderJob.update({
      where: { id: renderJob.id },
      data: { bullJobId: job.id },
    });

    return renderJob;
  }

  async getStatus(contentId: string) {
    return this.prisma.renderJob.findFirst({
      where: { contentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async renderToImages(contentId: string): Promise<RenderResult> {
    const content = await this.prisma.content.findUniqueOrThrow({
      where: { id: contentId },
    });

    const carouselData = content.slidesData as unknown as CarouselInput;
    const { html, slideCount } = renderCarousel(carouselData);

    // Dynamic import playwright to avoid loading in API process
    const { chromium } = await import('playwright');

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1080, height: 1080 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    // Load HTML content
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.evaluate(() => (document as any).fonts.ready);
    await new Promise((r) => setTimeout(r, 1000));

    const ISOLATE_JS = `(idx) => {
      const slides = document.querySelectorAll('.slide');
      slides.forEach((s, i) => {
        s.style.display = i === idx ? 'flex' : 'none';
        s.style.transform = 'none';
        s.style.margin = '0';
      });
      const gallery = document.querySelector('.gallery');
      if (gallery) {
        gallery.style.gridTemplateColumns = '1080px';
        gallery.style.gap = '0';
        gallery.style.justifyContent = 'flex-start';
        gallery.style.maxWidth = '1080px';
      }
      document.body.style.padding = '0';
      document.body.style.margin = '0';
      document.body.style.background = '#fff';
      window.scrollTo(0, 0);
    }`;

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, 19);
    const slides: RenderResult['slides'] = [];
    const playwrightByPos = new Map<number, Buffer>();

    for (let i = 0; i < slideCount; i++) {
      await page.evaluate(ISOLATE_JS, i);
      await new Promise((r) => setTimeout(r, 200));

      const buf = await page.screenshot({
        type: 'png',
        clip: { x: 0, y: 0, width: 1080, height: 1080 },
        omitBackground: false,
      });

      const buffer = Buffer.from(buf);
      playwrightByPos.set(i, buffer);
      const key = `${contentId}/${timestamp}/slide-${String(i + 1).padStart(2, '0')}.png`;
      await this.minio.putBuffer(key, buffer, 'image/png');

      const imageUrl = this.minio.publicUrl(key);

      await this.prisma.slide.upsert({
        where: {
          id: await this.findOrCreateSlideId(contentId, i),
        },
        update: { imageUrl, imageKey: key },
        create: {
          contentId,
          position: i,
          slideType:
            i === 0 ? 'COVER' : i === slideCount - 1 ? 'CTA' : 'BODY',
          bodyData: {},
          imageUrl,
          imageKey: key,
        },
      });

      slides.push({
        position: i,
        imageUrl,
        imageKey: key,
        sizeBytes: buffer.length,
      });

      this.logger.log(
        `Slide ${i + 1}/${slideCount} rendered (${Math.round(buffer.length / 1024)}KB)`,
      );
    }

    await browser.close();

    if (process.env.RENDER_SHADOW_SKIA === '1') {
      await this.runShadowCompareSkia(carouselData, playwrightByPos, content.tenantId);
    }

    return { contentId, slides };
  }

  /**
   * Shadow-compare (RFC §8 / Sprint 1): renderiza o MESMO conteúdo pelo engine
   * skia (scene-engine) em paralelo ao Playwright e loga o diff pixel-a-pixel.
   * Não substitui as imagens publicadas — só mede a paridade rumo ao cutover.
   * Ligado por RENDER_SHADOW_SKIA=1; qualquer falha é não-bloqueante.
   */
  private async runShadowCompareSkia(
    carouselData: CarouselInput,
    playwrightByPos: Map<number, Buffer>,
    tenantId?: string,
  ): Promise<void> {
    try {
      const { renderScenePng, diffPng } = (await import(
        '@publisher/scene-engine/node'
      )) as typeof import('@publisher/scene-engine/node');

      // kit do tenant (mesma fonte do estúdio) — paridade de marca no server
      const dbKit = tenantId
        ? await this.prisma.brandKit.findFirst({ where: { tenantId, isDefault: true } })
        : null;
      const brandKit = dbKit
        ? ({
            id: dbKit.id,
            tenantId: dbKit.tenantId,
            version: dbKit.version,
            typography: dbKit.typography,
            palette: dbKit.palette,
            brand: dbKit.brand,
          } as unknown as import('@publisher/scene-engine').BrandKit)
        : undefined;

      const doc = carouselToDoc(carouselData);
      const t0 = Date.now();
      const rendered = renderScenePng(doc, { pixelRatio: 2, brandKit });
      const dt = Date.now() - t0;

      let worst = 0;
      for (const r of rendered) {
        const ref = playwrightByPos.get(r.index);
        if (!ref) continue;
        const d = diffPng(r.png, ref);
        worst = Math.max(worst, d.ratio);
        this.logger.log(
          `[shadow] slide ${r.index}: diff ${(d.ratio * 100).toFixed(2)}% ` +
            `(${r.nodeCount} nós, skia ${r.width}x${r.height})` +
            (d.mismatchedSize ? ' [DIMENSÕES DIFEREM]' : ''),
        );
      }
      this.logger.log(
        `[shadow] skia: ${rendered.length} slides em ${dt}ms — pior diff ${(worst * 100).toFixed(2)}%`,
      );
    } catch (e) {
      this.logger.warn(
        `[shadow] comparação skia falhou (não bloqueia o render): ${(e as Error).message}`,
      );
    }
  }

  private async findOrCreateSlideId(
    contentId: string,
    position: number,
  ): Promise<string> {
    const existing = await this.prisma.slide.findFirst({
      where: { contentId, position },
    });
    return existing?.id ?? uuid();
  }
}
