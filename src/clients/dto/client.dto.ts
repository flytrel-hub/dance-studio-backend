import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, IsEnum, IsDateString } from 'class-validator';

export class CreateClientDto {
  @ApiProperty({ example: 'Иван Иванов' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: '+7 (999) 123-45-67' })
  @IsString()
  phone: string;

  @ApiProperty({ example: 'client@email.ru' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '2000-01-01' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ enum: ['MALE', 'FEMALE'] })
  @IsOptional()
  @IsEnum(['MALE', 'FEMALE'])
  gender?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  password?: string;
}

export class UpdateClientDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ enum: ['MALE', 'FEMALE'] })
  @IsOptional()
  @IsEnum(['MALE', 'FEMALE'])
  gender?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}
