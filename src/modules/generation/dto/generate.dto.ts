import { IsString, IsIn, IsOptional } from 'class-validator';
import { PERSONAS, PATTERNS, Persona, HookPattern, TemplateName } from '../types';

export class GenerateDto {
  @IsString()
  tema: string;

  @IsIn(PERSONAS)
  persona: Persona;

  @IsOptional()
  @IsIn(PATTERNS)
  pattern?: HookPattern;

  /** família visual escolhida no wizard; ausente = automático (pelo pattern). */
  @IsOptional()
  @IsIn(['step', 'compendium'])
  template?: TemplateName;
}
