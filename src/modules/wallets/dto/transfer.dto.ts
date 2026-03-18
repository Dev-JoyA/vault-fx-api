import {
  IsString,
  Length,
  IsNumber,
  IsPositive,
  Min,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TransferDto {
  @IsUUID()
  recipientId!: string;

  @IsString()
  @Length(3, 3)
  currency!: string;

  @IsNumber()
  @IsPositive()
  @Min(100)
  @Type(() => Number)
  amount!: number;
}
