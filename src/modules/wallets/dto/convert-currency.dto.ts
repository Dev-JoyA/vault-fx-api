import { IsString, Length, IsNumber, Min, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class ConvertCurrencyDto {
  @IsString()
  @Length(3, 3)
  fromCurrency!: string;

  @IsString()
  @Length(3, 3)
  toCurrency!: string;

  @IsNumber()
  @IsPositive()
  @Min(100)
  @Type(() => Number)
  amount!: number;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  fxRate!: number;
}
