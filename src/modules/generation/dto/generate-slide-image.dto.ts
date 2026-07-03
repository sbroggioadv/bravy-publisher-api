import { IsOptional, IsString, MaxLength } from 'class-validator';

export class GenerateSlideImageDto {
  /** override do image_prompt gravado no slide (opcional). */
  @IsOptional()
  @IsString()
  @MaxLength(600)
  prompt?: string;
}
