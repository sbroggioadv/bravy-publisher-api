import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class RegenerateSlideDto {
  @IsUUID()
  contentId: string;

  /** posição/índice de cena do slide (1..N são corpo; cover=0, cta=último). */
  @IsInt()
  @Min(1)
  position: number;

  @IsOptional()
  @IsString()
  hint?: string;
}
