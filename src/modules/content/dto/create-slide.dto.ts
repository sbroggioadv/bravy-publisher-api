import { IsInt, IsEnum, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { SlideType } from '@prisma/client';

export class CreateSlideDto {
  @IsInt()
  @Min(0)
  position: number;

  @IsEnum(SlideType)
  slideType: SlideType;

  @IsObject()
  bodyData: any;

  /** Deltas do editor de cena (scene-engine OverrideMap), esparso por slide. */
  @IsOptional()
  @IsObject()
  sceneOverrides?: any;

  /** PNG exportado pelo estúdio (cliente) — persistido p/ publicação. */
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  imageKey?: string;
}
