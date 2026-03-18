import { Injectable, BadRequestException } from '@nestjs/common';
import { WalletsService } from '../wallets/wallets.service';
import { FxService } from '../fx/fx.service';
import { TradeType } from './dto/trade.dto';
import { WalletResponse } from '../../common/interfaces/wallet-response.interface';

@Injectable()
export class TradingService {
  private readonly supportedCurrencies = [
    'USD',
    'EUR',
    'GBP',
    'CAD',
    'JPY',
    'CHF',
    'AUD',
  ];

  constructor(
    private readonly walletsService: WalletsService,
    private readonly fxService: FxService,
  ) {}

  async tradeNgnToForeign(
    userId: string,
    targetCurrency: string,
    ngnAmount: number,
    idempotencyKey?: string,
  ) {
    if (targetCurrency === 'NGN') {
      throw new BadRequestException('Target currency cannot be NGN');
    }

    if (!this.supportedCurrencies.includes(targetCurrency)) {
      throw new BadRequestException(
        `Unsupported currency: ${targetCurrency}. Supported: ${this.supportedCurrencies.join(', ')}`,
      );
    }

    const rate = await this.fxService.getPairRate('NGN', targetCurrency);

    const result = (await this.walletsService.convertCurrency(
      userId,
      'NGN',
      targetCurrency,
      ngnAmount,
      rate,
      idempotencyKey,
    )) as WalletResponse;

    return {
      message: 'Trade executed successfully',
      data: {
        reference: result.data.reference,
        tradeType: TradeType.NGN_TO_FOREIGN,
        fromCurrency: 'NGN',
        toCurrency: targetCurrency,
        fromAmount: ngnAmount,
        toAmount: result.data.toAmount,
        rate: rate,
        timestamp: result.data.timestamp,
      },
    };
  }

  async tradeForeignToNgn(
    userId: string,
    sourceCurrency: string,
    foreignAmount: number,
    idempotencyKey?: string,
  ) {
    if (sourceCurrency === 'NGN') {
      throw new BadRequestException(
        'Source currency cannot be NGN for foreign to NGN trade',
      );
    }

    if (!this.supportedCurrencies.includes(sourceCurrency)) {
      throw new BadRequestException(
        `Unsupported currency: ${sourceCurrency}. Supported: ${this.supportedCurrencies.join(', ')}`,
      );
    }

    const rate = await this.fxService.getPairRate(sourceCurrency, 'NGN');

    const result = (await this.walletsService.convertCurrency(
      userId,
      sourceCurrency,
      'NGN',
      foreignAmount,
      rate,
      idempotencyKey,
    )) as WalletResponse;

    return {
      message: 'Trade executed successfully',
      data: {
        reference: result.data.reference,
        tradeType: TradeType.FOREIGN_TO_NGN,
        fromCurrency: sourceCurrency,
        toCurrency: 'NGN',
        fromAmount: foreignAmount,
        toAmount: result.data.toAmount,
        rate: rate,
        timestamp: result.data.timestamp,
      },
    };
  }
}
