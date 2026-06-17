import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MinioClient } from '../../database/minio.client';

/**
 * Upload do PNG exportado pelo estúdio (RFC §6.3). O cliente rasteriza o slide
 * via o mesmo scene-engine (paintSlide offscreen 2x) e sobe o blob; devolvemos
 * a chave + URL pública (servida pelo FilesController) p/ gravar em Slide.
 */
@Controller('uploads')
export class UploadsController {
  constructor(private readonly minio: MinioClient) {}

  @Post('slide-image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadSlideImage(
    @CurrentUser() user: { userId: string; tenantId: string },
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { contentId?: string; position?: string },
  ): Promise<{ imageUrl: string; imageKey: string }> {
    if (!file) throw new BadRequestException('Arquivo "file" ausente');
    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('O arquivo precisa ser uma imagem');
    }

    const contentId = body.contentId?.trim() || 'misc';
    const position = String(body.position ?? '0').padStart(2, '0');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const key = `${contentId}/studio/${stamp}/slide-${position}.png`;

    await this.minio.putBuffer(key, file.buffer, file.mimetype);

    return { imageUrl: this.minio.publicUrl(key), imageKey: key };
  }
}
