import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, IsEnum, IsDateString, Min, Max } from 'class-validator';

export class CreateSubscriptionDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  clientId: number;

  @ApiProperty({ enum: ['FOUR_LESSONS', 'EIGHT_LESSONS', 'TWELVE_LESSONS', 'UNLIMITED'] })
  @IsEnum(['FOUR_LESSONS', 'EIGHT_LESSONS', 'TWELVE_LESSONS', 'UNLIMITED'])
  type: string;

  @ApiProperty({ example: '2025-05-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2025-06-01' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: 9200 })
  @IsNumber()
  @Min(100)
  @Max(100000)
  price: number;
}

export class RequestSubscriptionDto {
  @ApiProperty({ enum: ['FOUR_LESSONS', 'EIGHT_LESSONS', 'TWELVE_LESSONS', 'UNLIMITED'] })
  @IsEnum(['FOUR_LESSONS', 'EIGHT_LESSONS', 'TWELVE_LESSONS', 'UNLIMITED'])
  type: string;

  @ApiProperty({ example: 9200 })
  @IsNumber()
  @Min(100)
  @Max(100000)
  price: number;
}

export class ApproveSubscriptionDto {
  @ApiProperty({ example: '2025-05-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2025-06-01' })
  @IsDateString()
  endDate: string;
}

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({ enum: ['ACTIVE', 'FROZEN', 'EXPIRED', 'COMPLETED'] })
  @IsOptional()
  @IsEnum(['ACTIVE', 'FROZEN', 'EXPIRED', 'COMPLETED'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class FreezeSubscriptionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
