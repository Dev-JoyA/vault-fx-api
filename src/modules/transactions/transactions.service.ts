import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TransactionsRepository } from './transactions.repository';
import { TransactionQueryDto } from './dto/transaction.dto';
import { Transaction } from './entities/transaction.entity';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
  ) {}

  async getUserTransactions(userId: string, query: TransactionQueryDto) {
    const { page = 1, limit = 10, type, status, fromDate, toDate } = query;

    if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
      throw new BadRequestException('fromDate cannot be after toDate');
    }

    const [transactions, total] =
      await this.transactionsRepository.findByUserWithFilters(userId, {
        page,
        limit,
        type,
        status,
        fromDate,
        toDate,
      });

    const formattedTransactions = transactions.map((tx) =>
      this.formatTransactionResponse(tx),
    );

    return {
      data: formattedTransactions,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getTransactionByReference(userId: string, reference: string) {
    const transaction =
      await this.transactionsRepository.findByReference(reference);

    if (!transaction || transaction.userId !== userId) {
      throw new NotFoundException('Transaction not found');
    }

    return this.formatTransactionResponse(transaction);
  }

  async getTransactionById(userId: string, id: string) {
    const transaction = await this.transactionsRepository.findById(id);

    if (!transaction || transaction.userId !== userId) {
      throw new NotFoundException('Transaction not found');
    }

    return this.formatTransactionResponse(transaction);
  }

  async getTransactionSummary(userId: string, days: number = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const summary = await this.transactionsRepository.getTransactionSummary(
      userId,
      startDate,
      endDate,
    );

    return {
      period: {
        from: startDate,
        to: endDate,
      },
      summary,
    };
  }

  private formatTransactionResponse(transaction: Transaction) {
    return {
      id: transaction.id,
      type: transaction.type,
      status: transaction.status,
      sourceCurrency: transaction.sourceCurrency,
      targetCurrency: transaction.targetCurrency,
      sourceAmount: transaction.sourceAmount
        ? Number(transaction.sourceAmount)
        : null,
      targetAmount: transaction.targetAmount
        ? Number(transaction.targetAmount)
        : null,
      fxRate: transaction.fxRate ? Number(transaction.fxRate) : null,
      reference: transaction.reference,
      walletId: transaction.walletId,
      metadata: transaction.metadata,
      createdAt: transaction.createdAt,
      completedAt: transaction.completedAt,
    };
  }
}
