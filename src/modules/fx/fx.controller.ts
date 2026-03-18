import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { FxService } from './fx.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FxRateDto } from './dto/fx-rate.dto';

@ApiTags('fx')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fx')
export class FxController {
  constructor(private readonly fxService: FxService) {}

  @Get('rates')
  @ApiOperation({ summary: 'Get FX rates for supported currencies' })
  @ApiResponse({ status: 200, description: 'Returns current FX rates' })
  @ApiResponse({ status: 503, description: 'FX provider unavailable' })
  async getRates(@Query() query: FxRateDto) {
    const baseCurrency = query.baseCurrency || 'USD';
    return await this.fxService.getRates(baseCurrency, query.targetCurrencies);
  }

  @Get('pair')
  @ApiOperation({ summary: 'Get exchange rate for a specific currency pair' })
  @ApiQuery({ name: 'from', example: 'NGN', description: 'Base currency' })
  @ApiQuery({ name: 'to', example: 'USD', description: 'Target currency' })
  @ApiResponse({ status: 200, description: 'Returns the exchange rate' })
  @ApiResponse({ status: 400, description: 'Missing or invalid parameters' })
  @ApiResponse({ status: 503, description: 'FX provider unavailable' })
  async getPairRate(
    @Query('from') fromCurrency: string,
    @Query('to') toCurrency: string,
  ) {
    if (!fromCurrency || !toCurrency) {
      throw new BadRequestException(
        'from and to currency parameters are required',
      );
    }

    const rate = await this.fxService.getPairRate(fromCurrency, toCurrency);
    return {
      from: fromCurrency,
      to: toCurrency,
      rate,
      timestamp: new Date(),
    };
  }

  @Get('convert')
  @ApiOperation({ summary: 'Convert an amount between two currencies' })
  @ApiQuery({
    name: 'amount',
    example: '1000',
    description: 'Amount to convert',
  })
  @ApiQuery({ name: 'from', example: 'NGN', description: 'Source currency' })
  @ApiQuery({ name: 'to', example: 'USD', description: 'Target currency' })
  @ApiResponse({
    status: 200,
    description: 'Returns converted amount and rate',
  })
  @ApiResponse({ status: 400, description: 'Missing or invalid parameters' })
  async convertAmount(
    @Query('amount') amount: string,
    @Query('from') fromCurrency: string,
    @Query('to') toCurrency: string,
  ) {
    if (!fromCurrency || !toCurrency) {
      throw new BadRequestException(
        'from and to currency parameters are required',
      );
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new BadRequestException('Amount must be a positive number');
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
  @ApiOperation({ summary: 'Get historical exchange rates' })
  @ApiQuery({ name: 'from', example: 'NGN', description: 'Base currency' })
  @ApiQuery({ name: 'to', example: 'USD', description: 'Target currency' })
  @ApiQuery({
    name: 'days',
    example: 7,
    description: 'Number of days (max 90)',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Returns historical rates' })
  @ApiResponse({ status: 400, description: 'Missing or invalid parameters' })
  async getHistoricalRates(
    @Query('from') fromCurrency: string,
    @Query('to') toCurrency: string,
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days: number,
  ) {
    if (!fromCurrency || !toCurrency) {
      throw new BadRequestException(
        'from and to currency parameters are required',
      );
    }

    if (days > 90) days = 90;
    if (days < 1) days = 1;

    return await this.fxService.getHistoricalRates(
      fromCurrency,
      toCurrency,
      days,
    );
  }
}
