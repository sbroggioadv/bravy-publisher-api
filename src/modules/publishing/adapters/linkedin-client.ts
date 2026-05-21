import { Injectable } from '@nestjs/common';
import { PublishAdapter, PublishParams, PublishResult } from './base-adapter';

@Injectable()
export class LinkedInClient implements PublishAdapter {
  readonly platform = 'LINKEDIN';

  async publishCarousel(): Promise<PublishResult> {
    throw new Error('LinkedIn adapter not yet implemented');
  }

  async validateCredentials(): Promise<boolean> {
    return false;
  }
}
