import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsArray } from 'class-validator';

export class CreateGroupDto {
  @ApiProperty({ example: 'Группа 1' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Hip-Hop' })
  @IsString()
  danceStyle: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  trainerId: number;

  @ApiProperty({ example: 15 })
  @IsNumber()
  maxMembers: number;

  @ApiPropertyOptional({ example: '💃' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ example: '#7C3AED' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  clientIds?: number[];
}

export class UpdateGroupDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  danceStyle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  trainerId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxMembers?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;
}

export class AddMembersDto {
  @ApiProperty({ type: [Number] })
  @IsArray()
  clientIds: number[];
}
