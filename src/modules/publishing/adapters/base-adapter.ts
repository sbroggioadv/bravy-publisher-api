export interface PublishResult {
  externalMediaId: string;
  platform: string;
  publishedAt: Date;
}

export interface PublishParams {
  imageUrls: string[];
  caption: string;
  accountId: string;
  accessToken: string;
}

export interface PublishAdapter {
  readonly platform: string;
  publishCarousel(params: PublishParams): Promise<PublishResult>;
  validateCredentials(accountId: string, accessToken: string): Promise<boolean>;
}
