import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './database/prisma.module';
import { MinioModule } from './database/minio.module';
import { RenderModule } from './modules/render/render.module';
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
    PrismaModule,
    MinioModule,
    FactCheckModule,
    RenderModule,
    PublishingModule,
  ],
})
export class WorkerModule {}
