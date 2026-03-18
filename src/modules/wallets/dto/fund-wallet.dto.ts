import { IsString, Length, IsNumber, Min, IsPositive } from 'class-validator';

export class FundWalletDto {
  @IsString()
  @Length(3, 3)
  currency!: string;

  @IsNumber()
  @IsPositive()
  @Min(100)
  amount!: number;
}
