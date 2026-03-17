import { Controller, Get, Query, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { FxService } from './fx.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FxRateDto } from './dto/fx-rate.dto';

@Controller('fx')
@UseGuards(JwtAuthGuard)
export class FxController {
  constructor(private readonly fxService: FxService) {}

  @Get('rates')
  async getRates(@Query() query: FxRateDto) {
    const baseCurrency = query.baseCurrency || 'USD';
    return await this.fxService.getRates(baseCurrency, query.targetCurrencies);
  }

  @Get('pair')
  async getPairRate(
    @Query('from') fromCurrency: string,
    @Query('to') toCurrency: string,
  ) {
    const rate = await this.fxService.getPairRate(fromCurrency, toCurrency);
    return {
      from: fromCurrency,
      to: toCurrency,
      rate,
      timestamp: new Date(),
    };
  }

  @Get('convert')
  async convertAmount(
    @Query('amount') amount: string,
    @Query('from') fromCurrency: string,
    @Query('to') toCurrency: string,
  ) {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return { error: 'Invalid amount provided' };
    }

    const result = await this.fxService.convertAmount(
      numericAmount,
      fromCurrency,
      toCurrency,
    );
    return {
      ...result,
      timestamp: new Date(),
    };
  }

  @Get('historical')
  async getHistoricalRates(
    @Query('from') fromCurrency: string,
    @Query('to') toCurrency: string,
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days: number,
  ) {
    if (days > 90) {
      days = 90;
    }
    
    return await this.fxService.getHistoricalRates(
      fromCurrency,
      toCurrency,
      days,
    );
  }
}