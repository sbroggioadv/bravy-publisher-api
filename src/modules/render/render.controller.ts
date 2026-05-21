import { Controller, Post, Get, Param } from '@nestjs/common';
import { RenderService } from './render.service';

@Controller('render')
export class RenderController {
  constructor(private readonly renderService: RenderService) {}

  @Post(':contentId')
  async startRender(@Param('contentId') contentId: string) {
    return this.renderService.enqueueRender(contentId);
  }

  @Get(':contentId/status')
  async getStatus(@Param('contentId') contentId: string) {
    return this.renderService.getStatus(contentId);
  }
}
