import { Injectable, BadRequestException } from '@nestjs/common';
import { WalletsService } from '../wallets/wallets.service';
import { FxService } from '../fx/fx.service';
import { TradeType } from './dto/trade.dto';

interface ConversionResult {
  data?: any;
  transaction?: any;
  reference?: string;
  timestamp?: Date;
}

@Injectable()
export class TradingService {
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
      throw new BadRequestException('Target currency cannot be NGN for NGN to foreign trade');
    }

    const rate = await this.fxService.getPairRate('NGN', targetCurrency);
    const foreignAmount = Number((ngnAmount * rate).toFixed(2));

    const result: ConversionResult = await this.walletsService.convertCurrency(
      userId,
      'NGN',
      targetCurrency,
      ngnAmount,
      rate,
      idempotencyKey,
    );


    let transactionData: any = result;
    if (result.data) {
      transactionData = result.data;
    } else if (result.transaction) {
      transactionData = result.transaction;
    }

    return {
      message: 'Trade executed successfully',
      data: {
        reference: transactionData.reference,
        tradeType: TradeType.NGN_TO_FOREIGN,
        fromCurrency: 'NGN',
        toCurrency: targetCurrency,
        fromAmount: ngnAmount,
        toAmount: foreignAmount,
        rate: rate,
        timestamp: transactionData.timestamp || new Date(),
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
      throw new BadRequestException('Source currency cannot be NGN for foreign to NGN trade');
    }

    const rate = await this.fxService.getPairRate(sourceCurrency, 'NGN');
    const ngnAmount = Number((foreignAmount * rate).toFixed(2));

    const result: ConversionResult = await this.walletsService.convertCurrency(
      userId,
      sourceCurrency,
      'NGN',
      foreignAmount,
      rate,
      idempotencyKey,
    );

    let transactionData: any = result;
    if (result.data) {
      transactionData = result.data;
    } else if (result.transaction) {
      transactionData = result.transaction;
    }

    return {
      message: 'Trade executed successfully',
      data: {
        reference: transactionData.reference,
        tradeType: TradeType.FOREIGN_TO_NGN,
        fromCurrency: sourceCurrency,
        toCurrency: 'NGN',
        fromAmount: foreignAmount,
        toAmount: ngnAmount,
        rate: rate,
        timestamp: transactionData.timestamp || new Date(),
      },
    };
  }
}