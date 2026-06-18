import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail } from 'class-validator';

export class CreateTrainerDto {
  @ApiProperty({ example: 'Иван Иванов' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: '+7 (999) 123-45-67' })
  @IsString()
  phone: string;

  @ApiProperty({ example: 'trainer@email.ru' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Hip-Hop' })
  @IsString()
  specialization: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  password?: string;
}

export class UpdateTrainerDto {
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
  @IsString()
  specialization?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
