import { Injectable, Logger } from '@nestjs/common';
import { PublishAdapter, PublishParams, PublishResult } from './base-adapter';

@Injectable()
export class InstagramClient implements PublishAdapter {
  readonly platform = 'INSTAGRAM';
  private readonly logger = new Logger(InstagramClient.name);
  private readonly API_BASE = 'https://graph.instagram.com/v21.0';
  private readonly PROCESS_WAIT_PER_SLIDE_MS = 8_000;
  private readonly CAROUSEL_WAIT_MS = 15_000;

  async publishCarousel(params: PublishParams): Promise<PublishResult> {
    const { imageUrls, caption, accountId, accessToken } = params;

    if (imageUrls.length < 2 || imageUrls.length > 10) {
      throw new Error(`Carousel requires 2-10 items, got ${imageUrls.length}`);
    }

    // PHASE 1: Create children sequentially (IG Login API does NOT support batch)
    this.logger.log(`Creating ${imageUrls.length} child containers...`);
    const childrenIds: string[] = [];

    for (let i = 0; i < imageUrls.length; i++) {
      const result = await this.igPost(`/${accountId}/media`, {
        image_url: imageUrls[i],
        is_carousel_item: 'true',
      }, accessToken);

      childrenIds.push(result.id);
      this.logger.log(`Child ${i + 1}/${imageUrls.length}: container ${result.id}`);
    }

    // PHASE 2: Wait for Meta to process children
    const waitMs = this.PROCESS_WAIT_PER_SLIDE_MS * childrenIds.length;
    this.logger.log(`Waiting ${waitMs}ms for processing...`);
    await this.sleep(waitMs);

    // PHASE 3: Create CAROUSEL parent container
    this.logger.log('Creating CAROUSEL container...');
    const carouselResult = await this.igPost(`/${accountId}/media`, {
      media_type: 'CAROUSEL',
      children: childrenIds.join(','),
      caption,
    }, accessToken);

    const carouselId = carouselResult.id;
    this.logger.log(`CAROUSEL ${carouselId}`);

    await this.sleep(this.CAROUSEL_WAIT_MS);

    // PHASE 4: Publish
    this.logger.log('Publishing...');
    const publishResult = await this.igPost(`/${accountId}/media_publish`, {
      creation_id: carouselId,
    }, accessToken);

    this.logger.log(`Published! media_id=${publishResult.id}`);

    return {
      externalMediaId: publishResult.id,
      platform: 'INSTAGRAM',
      publishedAt: new Date(),
    };
  }

  async validateCredentials(accountId: string, accessToken: string): Promise<boolean> {
    try {
      const result = await this.igGet(`/${accountId}`, { fields: 'id,username' }, accessToken);
      return !!result.id;
    } catch {
      return false;
    }
  }

  private async igPost(
    path: string,
    data: Record<string, string>,
    accessToken: string,
  ): Promise<any> {
    const url = `${this.API_BASE}${path}`;
    const body = new URLSearchParams({ ...data, access_token: accessToken });

    const response = await fetch(url, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const json = await response.json();

    if (json.error) {
      throw new Error(`IG API error at ${path}: ${json.error.message} (code ${json.error.code})`);
    }

    return json;
  }

  private async igGet(
    path: string,
    params: Record<string, string>,
    accessToken: string,
  ): Promise<any> {
    const searchParams = new URLSearchParams({ ...params, access_token: accessToken });
    const url = `${this.API_BASE}${path}?${searchParams}`;

    const response = await fetch(url, { method: 'GET' });
    return response.json();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
