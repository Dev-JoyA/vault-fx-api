import { IsString, Length, IsNumber, Min, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class TradeNgnToForeignDto {
  @IsString()
  @Length(3, 3, { message: 'Target currency must be a 3-letter code' })
  targetCurrency!: string;

  @IsNumber()
  @IsPositive({ message: 'Amount must be positive' })
  @Min(100, { message: 'Minimum trade amount is 100' })
  @Type(() => Number)
  amount!: number;
}

export class TradeForeignToNgnDto {
  @IsString()
  @Length(3, 3, { message: 'Source currency must be a 3-letter code' })
  sourceCurrency!: string;

  @IsNumber()
  @IsPositive({ message: 'Amount must be positive' })
  @Min(10, { message: 'Minimum trade amount is 10' })
  @Type(() => Number)
  amount!: number;
}

export enum TradeType {
  NGN_TO_FOREIGN = 'NGN_TO_FOREIGN',
  FOREIGN_TO_NGN = 'FOREIGN_TO_NGN',
}

export class TradeResponseDto {
  message!: string;
  data!: {
    reference: string;
    tradeType: TradeType;
    fromCurrency: string;
    toCurrency: string;
    fromAmount: number;
    toAmount: number;
    rate: number;
    timestamp: Date;
  };
}
