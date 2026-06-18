import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsEnum, IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AttendanceItemDto {
  @ApiProperty()
  @IsNumber()
  clientId: number;

  @ApiProperty({ enum: ['PRESENT', 'ABSENT'] })
  @IsEnum(['PRESENT', 'ABSENT'])
  status: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}

export class MarkAttendanceDto {
  @ApiProperty({ type: [AttendanceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceItemDto)
  items: AttendanceItemDto[];
}

export class CreateAttendanceDto {
  @ApiProperty()
  @IsNumber()
  lessonId: number;

  @ApiProperty()
  @IsNumber()
  clientId: number;

  @ApiProperty({ enum: ['PRESENT', 'ABSENT'] })
  @IsEnum(['PRESENT', 'ABSENT'])
  status: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}
