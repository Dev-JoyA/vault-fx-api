import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { FxRepository } from './fx.repository';
import { FxRateResponseDto } from './dto/fx-rate.dto';

interface ExchangeRateResponse {
  result: string;
  base_code: string;
  conversion_rates: Record<string, number>;
  time_last_update_utc: string;
}

@Injectable()
export class FxService {
  private readonly logger = new Logger(FxService.name);
  private readonly apiUrl: string;
  private readonly supportedCurrencies = [
    'NGN',
    'USD',
    'EUR',
    'GBP',
    'CAD',
    'JPY',
    'CHF',
    'AUD',
  ];
  private cache: Map<
    string,
    { rates: Record<string, number>; timestamp: Date }
  > = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly fxRepository: FxRepository,
  ) {
    this.apiUrl =
      this.configService.get<string>('fx.apiUrl') ||
      `https://v6.exchangerate-api.com/v6/${this.configService.get<string>('fx.apiKey')}/latest/`;
  }

  async getRates(
    baseCurrency: string = 'USD',
    targetCurrencies?: string[],
  ): Promise<FxRateResponseDto> {
    try {
      const targets = targetCurrencies || this.supportedCurrencies;
      const cacheKey = `${baseCurrency}_${targets.sort().join('_')}`;

      const cachedRate = await this.getCachedRate(cacheKey);
      if (cachedRate) {
        this.logger.log(`Returning cached FX rates for ${baseCurrency}`);
        return cachedRate;
      }

      const rates = await this.fetchRatesFromProvider(baseCurrency, targets);

      await this.cacheRates(baseCurrency, rates);

      return {
        base: baseCurrency,
        rates,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch FX rates: ${(error as Error).message}`,
      );

      const fallbackRates = await this.getFallbackRates(
        baseCurrency,
        targetCurrencies,
      );
      if (fallbackRates) {
        return fallbackRates;
      }

      throw new HttpException(
        'Unable to fetch exchange rates at this time',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async getPairRate(
    baseCurrency: string,
    targetCurrency: string,
  ): Promise<number> {
    if (baseCurrency === targetCurrency) {
      return 1;
    }

    this.logger.log(`Fetching rate for ${baseCurrency}/${targetCurrency}`);

    try {
      const cacheKey = `${baseCurrency}_${targetCurrency}`;
      const cached = this.cache.get(cacheKey);

      if (cached && this.isCacheValid(cached.timestamp)) {
        const rate = this.parseRate(cached.rates[targetCurrency]);
        this.logger.log(
          `Cache hit: ${baseCurrency}/${targetCurrency} = ${rate}`,
        );
        return rate;
      }

      const dbRate = await this.fxRepository.findLatestRate(
        baseCurrency,
        targetCurrency,
      );
      if (dbRate && this.isDbRateValid(dbRate.timestamp)) {
        const rate = this.parseRate(dbRate.rate);
        this.logger.log(
          `Database hit: ${baseCurrency}/${targetCurrency} = ${rate}`,
        );
        return rate;
      }

      this.logger.log(
        `Fetching from provider: ${baseCurrency}/${targetCurrency}`,
      );
      const rates = await this.fetchRatesFromProvider(baseCurrency, [
        targetCurrency,
      ]);

      if (rates && rates[targetCurrency]) {
        const rate = rates[targetCurrency];
        await this.cacheRates(baseCurrency, rates);
        this.logger.log(
          `Provider rate: ${baseCurrency}/${targetCurrency} = ${rate}`,
        );
        return rate;
      }

      throw new Error(
        `No rate available for ${baseCurrency}/${targetCurrency}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(
        `Failed to get rate for ${baseCurrency}/${targetCurrency}: ${errorMessage}`,
      );

      if (baseCurrency !== 'USD' && targetCurrency !== 'USD') {
        try {
          const usdBase = await this.getPairRate('USD', baseCurrency);
          const usdTarget = await this.getPairRate('USD', targetCurrency);
          const crossRate = usdTarget / usdBase;
          this.logger.log(
            `Cross rate via USD: ${baseCurrency}/${targetCurrency} = ${crossRate}`,
          );
          return crossRate;
        } catch (crossError) {
          const crossErrorMessage =
            crossError instanceof Error ? crossError.message : 'Unknown error';
          this.logger.error(`Cross rate fallback failed: ${crossErrorMessage}`);
        }
      }

      throw new HttpException(
        `Unable to fetch exchange rate for ${baseCurrency}/${targetCurrency}`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async convertAmount(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<{ amount: number; rate: number; result: number }> {
    if (fromCurrency === toCurrency) {
      return {
        amount,
        rate: 1,
        result: amount,
      };
    }

    const rate = await this.getPairRate(fromCurrency, toCurrency);
    const result = Number((amount * rate).toFixed(2));

    return {
      amount,
      rate,
      result,
    };
  }

  async getHistoricalRates(
    baseCurrency: string,
    targetCurrency: string,
    days: number = 7,
  ): Promise<Array<{ date: Date; rate: number }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const rates = await this.fxRepository.findRatesAfter(
      baseCurrency,
      targetCurrency,
      startDate,
    );

    return rates.map((rate) => ({
      date: rate.timestamp,
      rate: Number(rate.rate),
    }));
  }

  private async fetchRatesFromProvider(
    baseCurrency: string,
    targets: string[],
  ): Promise<Record<string, number>> {
    try {
      const url = `${this.apiUrl}${baseCurrency}`;
      const response = await axios.get<ExchangeRateResponse>(url, {
        timeout: 5000,
      });

      const filteredRates: Record<string, number> = {};
      targets.forEach((currency) => {
        if (response.data.conversion_rates[currency]) {
          filteredRates[currency] = response.data.conversion_rates[currency];
        }
      });

      return filteredRates;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error(`Provider API error: ${error.message}`, error.stack);
        if (error.response) {
          this.logger.error(`Response status: ${error.response.status}`);
          this.logger.error(
            `Response data: ${JSON.stringify(error.response.data)}`,
          );
        }
      } else if (error instanceof Error) {
        this.logger.error(`Provider API error: ${error.message}`, error.stack);
      } else {
        this.logger.error('Provider API error: Unknown error occurred');
      }
      throw error;
    }
  }

  private async cacheRates(
    baseCurrency: string,
    rates: Record<string, number>,
  ): Promise<void> {
    try {
      const timestamp = new Date();

      for (const [currency, rate] of Object.entries(rates)) {
        await this.fxRepository.createRate(baseCurrency, currency, rate);

        const cacheKey = `${baseCurrency}_${currency}`;
        this.cache.set(cacheKey, {
          rates: { [currency]: rate },
          timestamp,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to cache rates: ${(error as Error).message}`);
    }
  }

  private async getCachedRate(
    cacheKey: string,
  ): Promise<FxRateResponseDto | null> {
    const cached = this.cache.get(cacheKey);

    if (cached && this.isCacheValid(cached.timestamp)) {
      const baseCurrency = cacheKey.split('_')[0];
      return {
        base: baseCurrency,
        rates: cached.rates,
        timestamp: cached.timestamp,
      };
    }

    return null;
  }

  private async getFallbackRates(
    baseCurrency: string,
    targetCurrencies?: string[],
  ): Promise<FxRateResponseDto | null> {
    try {
      const targets = targetCurrencies || this.supportedCurrencies;
      const rates: Record<string, number> = {};

      for (const target of targets) {
        if (target === baseCurrency) {
          rates[target] = 1;
          continue;
        }

        const dbRate = await this.fxRepository.findLatestRate(
          baseCurrency,
          target,
        );
        if (dbRate) {
          rates[target] = Number(dbRate.rate);
        }
      }

      if (Object.keys(rates).length > 0) {
        this.logger.warn(`Using fallback database rates for ${baseCurrency}`);
        return {
          base: baseCurrency,
          rates,
          timestamp: new Date(),
        };
      }

      return null;
    } catch (error) {
      this.logger.error(`Fallback failed: ${(error as Error).message}`);
      return null;
    }
  }

  private isCacheValid(timestamp: Date): boolean {
    const cacheTtl = this.configService.get<number>('fx.cacheTtl') || 300;
    const now = new Date();
    const diffSeconds = (now.getTime() - timestamp.getTime()) / 1000;
    return diffSeconds < cacheTtl;
  }

  private isDbRateValid(timestamp: Date): boolean {
    const staleThreshold = 60 * 60 * 1000;
    const now = new Date();
    return now.getTime() - timestamp.getTime() < staleThreshold;
  }

  async refreshRates(): Promise<void> {
    try {
      for (const base of this.supportedCurrencies) {
        const targets = this.supportedCurrencies.filter((c) => c !== base);
        try {
          const rates = await this.fetchRatesFromProvider(base, targets);
          await this.cacheRates(base, rates);
          this.logger.log(`Refreshed rates for ${base}`);

          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          this.logger.error(
            `Failed to refresh rates for ${base}: ${(error as Error).message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Rate refresh failed: ${(error as Error).message}`);
    }
  }

  async cleanupOldRates(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      await this.fxRepository.deleteOldRates(thirtyDaysAgo);
      this.logger.log('Cleaned up old FX rates');
    } catch (error) {
      this.logger.error(`Cleanup failed: ${(error as Error).message}`);
    }
  }

  private parseRate(rate: string | number | null | undefined): number {
    if (rate === null || rate === undefined) return 0;
    if (typeof rate === 'number') return rate;
    return parseFloat(rate);
  }
}
