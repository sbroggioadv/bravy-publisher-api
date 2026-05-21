import { Injectable } from '@nestjs/common';
import { PublishAdapter } from './base-adapter';
import { InstagramClient } from './instagram-client';
import { LinkedInClient } from './linkedin-client';

@Injectable()
export class PublishAdapterRegistry {
  private readonly adapters: Map<string, PublishAdapter>;

  constructor(
    private readonly instagram: InstagramClient,
    private readonly linkedin: LinkedInClient,
  ) {
    this.adapters = new Map<string, PublishAdapter>([
      ['INSTAGRAM', instagram],
      ['LINKEDIN', linkedin],
    ]);
  }

  get(platform: string): PublishAdapter {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new Error(`No adapter registered for platform: ${platform}`);
    }
    return adapter;
  }
}
