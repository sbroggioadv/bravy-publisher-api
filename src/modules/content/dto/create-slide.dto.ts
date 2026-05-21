import { IsInt, IsEnum, IsObject, Min } from 'class-validator';
import { SlideType } from '@prisma/client';

export class CreateSlideDto {
  @IsInt()
  @Min(0)
  position: number;

  @IsEnum(SlideType)
  slideType: SlideType;

  @IsObject()
  bodyData: any;
}
