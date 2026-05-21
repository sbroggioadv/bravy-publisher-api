import { IsString, IsEnum, IsOptional } from 'class-validator';

export class GenerateDto {
  @IsString()
  tema: string;

  @IsEnum(['contador', 'advogado', 'empresario', 'gestor', 'arquiteto'])
  persona: 'contador' | 'advogado' | 'empresario' | 'gestor' | 'arquiteto';

  @IsOptional()
  @IsEnum(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'])
  pattern?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';
}
