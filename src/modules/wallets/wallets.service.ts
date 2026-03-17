import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { WalletsRepository } from './wallets.repository';
import { TransactionsRepository } from '../transactions/transactions.repository';
import { IdempotencyRepository } from '../transactions/idempotency.repository';
import { TransactionType, TransactionStatus } from '../transactions/entities/transaction.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WalletsService {
  constructor(
    private readonly walletsRepository: WalletsRepository,
    private readonly transactionsRepository: TransactionsRepository,
    private readonly idempotencyRepository: IdempotencyRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

async getUserWallets(userId: string) {
  const wallets = await this.walletsRepository.findByUser(userId);
  return wallets.map(w => ({ ...w, balance: Number(w.balance) }));
}

  async getWalletBalance(userId: string, currency: string) {
  const wallet = await this.walletsRepository.findByUserAndCurrency(userId, currency);
  if (!wallet) {
    throw new NotFoundException(`Wallet for ${currency} not found`);
  }
  return { currency, balance: Number(wallet.balance), walletId: wallet.id };
}

  async fundWallet(
    userId: string,
    currency: string,
    amount: number,
    idempotencyKey?: string,
  ) {
    const finalIdempotencyKey = idempotencyKey || uuidv4();
    
    const existingRecord = await this.idempotencyRepository.findValidKey(
      finalIdempotencyKey,
      userId,
    );

    if (existingRecord) {
      if (existingRecord.responseBody) {
        return existingRecord.responseBody;
      }
      throw new ConflictException('Request already in progress');
    }

    await this.idempotencyRepository.createRecord(
      finalIdempotencyKey,
      userId,
      '/wallet/fund',
      { currency, amount },
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let wallet = await this.walletsRepository.findByUserAndCurrency(userId, currency);
      
      if (!wallet) {
        wallet = await this.walletsRepository.create(userId, currency);
      }

      const currentBalance = Number(wallet.balance);
      const newBalance = currentBalance + amount;
      
      await this.walletsRepository.updateBalance(wallet.id, newBalance);

      const reference = `FUND_${Date.now()}_${uuidv4().substring(0, 8)}`;
      const transaction = await this.transactionsRepository.create({
        userId,
        walletId: wallet.id,
        type: TransactionType.FUND,
        status: TransactionStatus.COMPLETED,
        sourceCurrency: currency,
        sourceAmount: amount.toString(),
        reference,
        metadata: { idempotencyKey: finalIdempotencyKey },
        completedAt: new Date(),
        });

      await queryRunner.commitTransaction();

      const response = {
        message: 'Wallet funded successfully',
        transaction: {
          reference: transaction.reference,
          currency,
          amount,
          newBalance,
          timestamp: transaction.completedAt,
        },
      };

      await this.idempotencyRepository.updateResponse(
        finalIdempotencyKey,
        response,
        200,
      );

      return response;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      
      await this.idempotencyRepository.updateResponse(
        finalIdempotencyKey,
        { error: (error as Error).message },
        500,
      );
      
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

async convertCurrency(
  userId: string,
  fromCurrency: string,
  toCurrency: string,
  amount: number,
  fxRate: number,
  idempotencyKey?: string,
) {
  return this.transferFunds(
    userId,
    fromCurrency,
    toCurrency,
    amount,
    fxRate,
    idempotencyKey,
  );
}

  async transferFunds(
    userId: string,
    fromCurrency: string,
    toCurrency: string,
    amount: number,
    fxRate: number,
    idempotencyKey?: string,
  ) {
    const finalIdempotencyKey = idempotencyKey || uuidv4();
    
    const existingRecord = await this.idempotencyRepository.findValidKey(
      finalIdempotencyKey,
      userId,
    );

    if (existingRecord?.responseBody) {
      return existingRecord.responseBody;
    }

    await this.idempotencyRepository.createRecord(
      finalIdempotencyKey,
      userId,
      '/wallet/convert',
      { fromCurrency, toCurrency, amount, fxRate },
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const fromWallet = await this.walletsRepository.findByUserAndCurrency(userId, fromCurrency);
      let toWallet = await this.walletsRepository.findByUserAndCurrency(userId, toCurrency);

      if (!fromWallet) {
        throw new BadRequestException(`No ${fromCurrency} wallet found`);
      }

      const fromBalance = Number(fromWallet.balance);
      if (fromBalance < amount) {
        throw new BadRequestException(`Insufficient ${fromCurrency} balance`);
      }

      const targetAmount = amount * fxRate;

      const newFromBalance = fromBalance - amount;
      await this.walletsRepository.updateBalance(fromWallet.id, newFromBalance);

      if (toWallet) {
        const toBalance = Number(toWallet.balance);
        const newToBalance = toBalance + targetAmount;
        await this.walletsRepository.updateBalance(toWallet.id, newToBalance);
      } else {
        toWallet = await this.walletsRepository.create(userId, toCurrency);
        await this.walletsRepository.updateBalance(toWallet.id, targetAmount);
      }

      const reference = `CONV_${Date.now()}_${uuidv4().substring(0, 8)}`;
      const transaction = await this.transactionsRepository.create({
        userId,
        walletId: fromWallet.id,
        type: TransactionType.CONVERT,
        status: TransactionStatus.COMPLETED,
        sourceCurrency: fromCurrency,
        targetCurrency: toCurrency,
        sourceAmount: amount.toString(), 
        targetAmount: targetAmount.toString(), 
        fxRate: fxRate.toString(), 
        reference,
        metadata: { idempotencyKey: finalIdempotencyKey },
        completedAt: new Date(),
        });

      await queryRunner.commitTransaction();

      const response = {
        message: 'Currency conversion successful',
        transaction: {
          reference: transaction.reference,
          fromCurrency,
          toCurrency,
          fromAmount: amount,
          toAmount: targetAmount,
          rate: fxRate,
          timestamp: transaction.completedAt,
        },
      };

      await this.idempotencyRepository.updateResponse(
        finalIdempotencyKey,
        response,
        200,
      );

      return response;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      await this.idempotencyRepository.updateResponse(
        finalIdempotencyKey,
        { error: (error as Error).message },
        500,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async transferToUser(
  senderId: string,
  recipientId: string,
  currency: string,
  amount: number,
  idempotencyKey?: string,
) {
  if (senderId === recipientId) {
    throw new BadRequestException('Cannot transfer to yourself');
  }

  const finalIdempotencyKey = idempotencyKey || uuidv4();
  
  // Check idempotency
  const existingRecord = await this.idempotencyRepository.findValidKey(
    finalIdempotencyKey,
    senderId,
  );

  if (existingRecord?.responseBody) {
    return existingRecord.responseBody;
  }

  await this.idempotencyRepository.createRecord(
    finalIdempotencyKey,
    senderId,
    '/wallet/transfer',
    { recipientId, currency, amount },
  );

  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Get sender wallet (must exist)
    const senderWallet = await this.walletsRepository.findByUserAndCurrency(senderId, currency);
    if (!senderWallet) {
      throw new BadRequestException(`You don't have a ${currency} wallet`);
    }

    // Check sufficient balance
    const senderBalance = Number(senderWallet.balance);
    if (senderBalance < amount) {
      throw new BadRequestException(`Insufficient ${currency} balance`);
    }

    // Get or create recipient wallet
    let recipientWallet = await this.walletsRepository.findByUserAndCurrency(recipientId, currency);
    if (!recipientWallet) {
      // Auto-create wallet for recipient
      recipientWallet = await this.walletsRepository.create(recipientId, currency);
    }

    // Update balances
    const newSenderBalance = senderBalance - amount;
    const recipientBalance = Number(recipientWallet.balance);
    const newRecipientBalance = recipientBalance + amount;

    await this.walletsRepository.updateBalance(senderWallet.id, newSenderBalance);
    await this.walletsRepository.updateBalance(recipientWallet.id, newRecipientBalance);

    // Create transaction record
    const reference = `TRF_${Date.now()}_${uuidv4().substring(0, 8)}`;
    const transaction = await this.transactionsRepository.create({
      userId: senderId,
      walletId: senderWallet.id,
      type: TransactionType.TRANSFER,
      status: TransactionStatus.COMPLETED,
      sourceCurrency: currency,
      sourceAmount: amount.toString(),
      reference,
      metadata: { 
        idempotencyKey: finalIdempotencyKey,
        recipientId,
        recipientWalletId: recipientWallet.id,
      },
      completedAt: new Date(),
    });

    await queryRunner.commitTransaction();

    const response = {
      message: 'Transfer successful',
      data: {
        reference: transaction.reference,
        currency,
        amount,
        recipientId,
        senderNewBalance: newSenderBalance,
        timestamp: transaction.completedAt,
      },
    };

    await this.idempotencyRepository.updateResponse(finalIdempotencyKey, response, 200);
    return response;
  } catch (error) {
    await queryRunner.rollbackTransaction();
    await this.idempotencyRepository.updateResponse(
      finalIdempotencyKey,
      { error: (error as Error).message },
      500,
    );
    throw error;
  } finally {
    await queryRunner.release();
  }
}
}