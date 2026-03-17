import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { IdempotencyRecord } from './entities/idempotency.entity';
import { TransactionsRepository } from './transactions.repository';
import { IdempotencyRepository } from './idempotency.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, IdempotencyRecord]),
  ],
  providers: [TransactionsRepository, IdempotencyRepository],
  exports: [TransactionsRepository, IdempotencyRepository],
})
export class TransactionsModule {}