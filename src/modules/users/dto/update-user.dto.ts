import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Joao Silva' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'joao@empresa.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'novaSenha123' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiProperty({ example: 'senhaAtual123', description: 'Obrigatorio ao alterar senha' })
  @IsOptional()
  @IsString()
  currentPassword?: string;
}

export class UpdateUserRoleDto {
  @ApiProperty({ example: 'ADMIN', enum: ['OWNER', 'ADMIN', 'EDITOR'] })
  @IsEnum(['OWNER', 'ADMIN', 'EDITOR'], {
    message: 'role deve ser OWNER, ADMIN ou EDITOR',
  })
  role: string;
}
