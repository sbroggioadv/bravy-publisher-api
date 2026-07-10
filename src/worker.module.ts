import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { CommonModule } from './common/common.module';
import { PrismaModule } from './database/prisma.module';
import { MinioModule } from './database/minio.module';
import { PublishingModule } from './modules/publishing/publishing.module';
import { FactCheckModule } from './modules/fact-check/fact-check.module';
import redisConfig from './config/redis.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [redisConfig],
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host', 'localhost'),
          port: config.get<number>('redis.port', 6379),
          password: config.get<string>('redis.password') || undefined,
        },
      }),
    }),
    // PublishingService injeta EncryptionService (exportado por CommonModule).
    // No app HTTP o CommonModule já entra via AppModule; no worker precisa ser explícito.
    CommonModule,
    PrismaModule,
    MinioModule,
    FactCheckModule,
    PublishingModule,
  ],
})
export class WorkerModule {}
