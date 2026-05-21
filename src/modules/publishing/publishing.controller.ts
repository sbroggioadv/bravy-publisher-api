import { Controller, Post, Param, Body } from '@nestjs/common';
import { PublishingService } from './publishing.service';
import { PublishContentDto } from './dto/publish-content.dto';

@Controller('publish')
export class PublishingController {
  constructor(private readonly publishingService: PublishingService) {}

  @Post(':contentId')
  async publish(
    @Param('contentId') contentId: string,
    @Body() dto: PublishContentDto,
  ) {
    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : undefined;
    return this.publishingService.enqueuePublish(
      contentId,
      dto.socialAccountId,
      scheduledAt,
    );
  }
}
