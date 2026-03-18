import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { IdempotencyRecord } from './entities/idempotency.entity';
import { TransactionsRepository } from './transactions.repository';
import { IdempotencyRepository } from './idempotency.repository';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, IdempotencyRecord])],
  controllers: [TransactionsController],
  providers: [
    TransactionsRepository,
    IdempotencyRepository,
    TransactionsService,
  ],
  exports: [TransactionsRepository, IdempotencyRepository, TransactionsService],
})
export class TransactionsModule {}
