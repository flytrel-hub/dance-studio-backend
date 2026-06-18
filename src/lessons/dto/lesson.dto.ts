import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsString, IsDateString, IsOptional, IsEnum, Matches, MinLength, MaxLength } from 'class-validator';

export class CreateLessonDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  groupId: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  trainerId: number;

  @ApiProperty({ example: '2025-05-20' })
  @IsDateString()
  lessonDate: string;

  @ApiProperty({ example: '10:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Формат времени: ЧЧ:ММ' })
  startTime: string;

  @ApiProperty({ example: '11:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Формат времени: ЧЧ:ММ' })
  endTime: string;

  @ApiProperty({ example: 'Зал 1' })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  room: string;

  @ApiPropertyOptional({ enum: ['OPEN', 'APPLICATION'], default: 'OPEN' })
  @IsOptional()
  @IsEnum(['OPEN', 'APPLICATION'])
  bookingType?: string;
}

export class UpdateLessonDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  groupId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  trainerId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  lessonDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  room?: string;

  @ApiPropertyOptional({ enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] })
  @IsOptional()
  @IsEnum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
  status?: string;

  @ApiPropertyOptional({ enum: ['OPEN', 'APPLICATION'] })
  @IsOptional()
  @IsEnum(['OPEN', 'APPLICATION'])
  bookingType?: string;
}
