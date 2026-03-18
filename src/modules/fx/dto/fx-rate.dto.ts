import { IsString, Length, IsOptional, IsArray } from 'class-validator';

export class FxRateDto {
  @IsOptional()
  @IsString()
  @Length(3, 3)
  baseCurrency?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Length(3, 3, { each: true })
  targetCurrencies?: string[];
}

export class FxRateResponseDto {
  @IsString()
  @Length(3, 3)
  base!: string;

  @IsArray()
  rates!: Record<string, number>;

  @IsString()
  timestamp!: Date;
}
