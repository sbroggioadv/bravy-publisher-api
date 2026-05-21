import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { MinioClient } from '../../database/minio.client';
import { renderCarousel } from './template-engine';
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

    for (let i = 0; i < slideCount; i++) {
      await page.evaluate(ISOLATE_JS, i);
      await new Promise((r) => setTimeout(r, 200));

      const buf = await page.screenshot({
        type: 'png',
        clip: { x: 0, y: 0, width: 1080, height: 1080 },
        omitBackground: false,
      });

      const buffer = Buffer.from(buf);
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
    return { contentId, slides };
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
