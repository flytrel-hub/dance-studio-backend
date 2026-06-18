import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, Min, Max, MaxLength } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  clientId: number;

  @ApiProperty({ example: 9200 })
  @IsNumber()
  @Min(1)
  @Max(10000000)
  amount: number;

  @ApiProperty({ example: 'Карта' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  paymentMethod: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  subscriptionId?: number;
}
