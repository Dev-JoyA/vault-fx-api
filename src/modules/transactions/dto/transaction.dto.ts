import { IsOptional, IsInt, Min, Max, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import {
  TransactionType,
  TransactionStatus,
} from '../entities/transaction.entity';

export class TransactionQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;
}

export class TransactionResponseDto {
  id!: string;
  type!: TransactionType;
  status!: TransactionStatus;
  sourceCurrency!: string | null;
  targetCurrency!: string | null;
  sourceAmount!: number | null;
  targetAmount!: number | null;
  fxRate!: number | null;
  reference!: string;
  createdAt!: Date;
  completedAt!: Date | null;
}
