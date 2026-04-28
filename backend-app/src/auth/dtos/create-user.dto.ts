import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  username!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsIn(['admin', 'user'])
  rol?: 'admin' | 'user';

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsBoolean()
  esSuscripcion?: boolean;

  @IsOptional()
  @IsString()
  fechaExpiracion?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modulosPermitidos?: string[];
}
