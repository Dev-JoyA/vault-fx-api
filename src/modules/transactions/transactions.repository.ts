import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Between,
  MoreThan,
  LessThan,
  FindOptionsWhere,
} from 'typeorm';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from './entities/transaction.entity';

export interface TransactionFilterOptions {
  page?: number;
  limit?: number;
  type?: TransactionType;
  status?: TransactionStatus;
  fromDate?: string;
  toDate?: string;
}

@Injectable()
export class TransactionsRepository {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async create(transactionData: Partial<Transaction>): Promise<Transaction> {
    const transaction = this.transactionRepository.create(transactionData);
    return await this.transactionRepository.save(transaction);
  }

  async findById(id: string): Promise<Transaction | null> {
    return await this.transactionRepository.findOne({
      where: { id },
      relations: ['user', 'wallet'],
    });
  }

  async findByReference(reference: string): Promise<Transaction | null> {
    return await this.transactionRepository.findOne({
      where: { reference },
      relations: ['user', 'wallet'],
    });
  }

  async findByUser(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<[Transaction[], number]> {
    return await this.transactionRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['wallet'],
    });
  }

  async findByUserWithFilters(
    userId: string,
    options: TransactionFilterOptions,
  ): Promise<[Transaction[], number]> {
    const { page = 1, limit = 10, type, status, fromDate, toDate } = options;

    const where: FindOptionsWhere<Transaction> = { userId };

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (fromDate && toDate) {
      where.createdAt = Between(new Date(fromDate), new Date(toDate));
    } else if (fromDate) {
      where.createdAt = MoreThan(new Date(fromDate));
    } else if (toDate) {
      where.createdAt = LessThan(new Date(toDate));
    }

    return await this.transactionRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['wallet'],
    });
  }

  async updateStatus(id: string, status: TransactionStatus): Promise<void> {
    const updateData: Partial<Transaction> = { status };
    if (status === TransactionStatus.COMPLETED) {
      updateData.completedAt = new Date();
    }
    await this.transactionRepository.update(id, updateData);
  }

  async findPendingTransactions(): Promise<Transaction[]> {
    return await this.transactionRepository.find({
      where: { status: TransactionStatus.PENDING },
      order: { createdAt: 'ASC' },
    });
  }

  async getTransactionSummary(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const transactions = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('transaction.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(transaction.sourceAmount)', 'totalAmount')
      .where('transaction.userId = :userId', { userId })
      .andWhere('transaction.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('transaction.type')
      .getRawMany();

    return transactions;
  }
}
