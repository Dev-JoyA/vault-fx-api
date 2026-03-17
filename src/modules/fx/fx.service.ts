import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { FxRepository } from './fx.repository';
import { FxRateResponseDto } from './dto/fx-rate.dto';

interface ExchangeRateResponse {
  base: string;
  rates: Record<string, number>;
  date: string;
  timestamp: number;
}

@Injectable()
export class FxService {
  private readonly logger = new Logger(FxService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly supportedCurrencies = ['NGN', 'USD', 'EUR', 'GBP', 'CAD', 'JPY', 'CHF', 'AUD'];
  private cache: Map<string, { rates: Record<string, number>; timestamp: Date }> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly fxRepository: FxRepository,
  ) {
    this.apiUrl = this.configService.get<string>('fx.apiUrl') || 'https://api.exchangerate-api.com/v4/latest/';
    this.apiKey = this.configService.get<string>('fx.apiKey') || '';
  }

  async getRates(baseCurrency: string = 'USD', targetCurrencies?: string[]): Promise<FxRateResponseDto> {
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
      this.logger.error(`Failed to fetch FX rates: ${(error as Error).message}`);
      
      const fallbackRates = await this.getFallbackRates(baseCurrency, targetCurrencies);
      if (fallbackRates) {
        return fallbackRates;
      }
      
      throw new HttpException(
        'Unable to fetch exchange rates at this time',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

async getPairRate(baseCurrency: string, targetCurrency: string): Promise<number> {
  if (baseCurrency === targetCurrency) {
    return 1;
  }

  try {
    const cacheKey = `${baseCurrency}_${targetCurrency}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && this.isCacheValid(cached.timestamp)) {
      return this.parseRate(cached.rates[targetCurrency]);
    }

    const dbRate = await this.fxRepository.findLatestRate(baseCurrency, targetCurrency);
    if (dbRate && this.isDbRateValid(dbRate.timestamp)) {
      return this.parseRate(dbRate.rate);
    }

    const rates = await this.fetchRatesFromProvider(baseCurrency, [targetCurrency]);
    await this.cacheRates(baseCurrency, rates);
    
    return this.parseRate(rates[targetCurrency]);
  } catch (error) {
    this.logger.error(`Failed to get pair rate ${baseCurrency}/${targetCurrency}: ${(error as Error).message}`);
    
    const dbRate = await this.fxRepository.findLatestRate(baseCurrency, targetCurrency);
    if (dbRate) {
      this.logger.warn(`Using stale database rate for ${baseCurrency}/${targetCurrency}`);
      return this.parseRate(dbRate.rate);
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

    return rates.map(rate => ({
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
        params: {
          apikey: this.apiKey,
          symbols: targets.join(','),
        },
        timeout: 5000,
      });

      const filteredRates: Record<string, number> = {};
      targets.forEach(currency => {
        if (response.data.rates[currency]) {
          filteredRates[currency] = response.data.rates[currency];
        }
      });

      return filteredRates;
    } catch (error) {
      this.logger.error(`Provider API error: ${(error as Error).message}`);
      throw error;
    }
  }

  private async cacheRates(baseCurrency: string, rates: Record<string, number>): Promise<void> {
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

  private async getCachedRate(cacheKey: string): Promise<FxRateResponseDto | null> {
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

        const dbRate = await this.fxRepository.findLatestRate(baseCurrency, target);
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
        const targets = this.supportedCurrencies.filter(c => c !== base);
        try {
          const rates = await this.fetchRatesFromProvider(base, targets);
          await this.cacheRates(base, rates);
          this.logger.log(`Refreshed rates for ${base}`);
          
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          this.logger.error(`Failed to refresh rates for ${base}: ${(error as Error).message}`);
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