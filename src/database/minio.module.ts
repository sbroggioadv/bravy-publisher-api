import { Global, Module } from '@nestjs/common';
import { MinioClient } from './minio.client';

@Global()
@Module({
  providers: [MinioClient],
  exports: [MinioClient],
})
export class MinioModule {}
