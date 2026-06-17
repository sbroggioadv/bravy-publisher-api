import { IsString, IsOptional, IsIn } from 'class-validator';
import { PERSONAS, PATTERNS, Persona, HookPattern } from '../types';

export class SuggestThemeDto {
  @IsOptional()
  @IsString()
  @IsIn(PERSONAS)
  persona?: Persona;

  @IsOptional()
  @IsString()
  @IsIn(PATTERNS)
  pattern?: HookPattern;

  /** Opcional: dica/area de interesse pra enviesar as sugestoes. */
  @IsOptional()
  @IsString()
  hint?: string;
}
