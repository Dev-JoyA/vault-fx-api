import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from './entities/wallet.entity';

@Injectable()
export class WalletsRepository {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
  ) {}

  async create(userId: string, currency: string): Promise<Wallet> {
    const wallet = this.walletRepository.create({
      userId,
      currency,
      balance: '0', 
    });
    return await this.walletRepository.save(wallet);
  }

  async findByUserAndCurrency(userId: string, currency: string): Promise<Wallet | null> {
    return await this.walletRepository.findOne({
      where: { userId, currency, isActive: true },
    });
  }

  async findByUser(userId: string): Promise<Wallet[]> {
    return await this.walletRepository.find({
      where: { userId, isActive: true },
    });
  }

  async findById(id: string): Promise<Wallet | null> {
    return await this.walletRepository.findOne({ where: { id, isActive: true } });
  }

  async updateBalance(id: string, newBalance: number): Promise<void> {
    await this.walletRepository.update(id, { 
      balance: newBalance.toString() 
    });
  }

  async getWalletsWithLock(walletIds: string[]): Promise<Wallet[]> {
    const queryBuilder = this.walletRepository.createQueryBuilder('wallet');
    return await queryBuilder
      .where('wallet.id IN (:...walletIds)', { walletIds })
      .setLock('pessimistic_write')
      .getMany();
  }
}