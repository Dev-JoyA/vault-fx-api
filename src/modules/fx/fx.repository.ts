import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { FxRate } from './entities/fx-rate.entity';

@Injectable()
export class FxRepository {
  constructor(
    @InjectRepository(FxRate)
    private readonly fxRepository: Repository<FxRate>,
  ) {}

  async createRate(
    baseCurrency: string,
    targetCurrency: string,
    rate: number,
  ): Promise<FxRate> {
    const fxRate = this.fxRepository.create({
      baseCurrency,
      targetCurrency,
      rate: rate.toString(),
      timestamp: new Date(),
    });
    return await this.fxRepository.save(fxRate);
  }

  async findLatestRate(
    baseCurrency: string,
    targetCurrency: string,
  ): Promise<FxRate | null> {
    return await this.fxRepository.findOne({
      where: { baseCurrency, targetCurrency },
      order: { timestamp: 'DESC' },
    });
  }

  async findRatesAfter(
    baseCurrency: string,
    targetCurrency: string,
    after: Date,
  ): Promise<FxRate[]> {
    return await this.fxRepository.find({
      where: {
        baseCurrency,
        targetCurrency,
        timestamp: MoreThan(after),
      },
      order: { timestamp: 'ASC' },
    });
  }

  async deleteOldRates(before: Date): Promise<void> {
    await this.fxRepository.delete({
      timestamp: LessThan(before),
    });
  }

  async getRatesByBase(baseCurrency: string): Promise<FxRate[]> {
    return await this.fxRepository.find({
      where: { baseCurrency },
      order: { timestamp: 'DESC' },
    });
  }
}
