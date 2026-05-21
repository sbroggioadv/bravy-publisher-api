import { IsEmail, IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Minha Empresa' })
  @IsString()
  @IsNotEmpty()
  tenantName: string;

  @ApiProperty({ example: 'minha-empresa' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'tenantSlug deve conter apenas letras minusculas, numeros e hifens',
  })
  tenantSlug: string;

  @ApiProperty({ example: 'Joao Silva' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'joao@empresa.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'senhaSegura123' })
  @IsString()
  @MinLength(8)
  password: string;
}
