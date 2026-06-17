import { Controller, Get, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { MinioClient } from '../../database/minio.client';

/**
 * Public proxy for objects living in MinIO. Lets the Meta Graph and LinkedIn
 * APIs fetch rendered slide PNGs over our public tunnel without exposing the
 * MinIO endpoint directly. Uses a catch-all so multi-segment keys (with `/`)
 * resolve to the underlying object key.
 *
 * SkipThrottle: serve assets (fontes + PNGs) em rajada — um load do estúdio
 * busca ~8 fontes + N imagens de uma vez, e o Meta/LinkedIn baixam o carrossel
 * inteiro ao publicar. Contar isso no rate limit global derruba o app (429).
 */
@SkipThrottle()
@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(private readonly minio: MinioClient) {}

  @Public()
  @Get('*')
  async getFile(@Req() req: Request, @Res() res: Response): Promise<void> {
    // Strip the controller prefix to recover the object key (which itself may
    // contain `/`). req.path is "/api/v1/files/<key>"; baseUrl would be empty
    // because we never call setBaseUrl on the controller, so slice manually.
    const prefix = '/api/v1/files/';
    const idx = req.originalUrl.indexOf(prefix);
    const raw = idx >= 0 ? req.originalUrl.slice(idx + prefix.length) : '';
    const key = decodeURIComponent(raw.split('?')[0]);

    const { body, contentType, contentLength } = await this.minio.getObject(key);

    res.setHeader('Content-Type', contentType ?? 'application/octet-stream');
    if (contentLength) res.setHeader('Content-Length', String(contentLength));
    res.setHeader('Cache-Control', 'public, max-age=300');
    body.pipe(res);
  }
}
