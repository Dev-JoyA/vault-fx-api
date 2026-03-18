import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { WalletsRepository } from './wallets.repository';
import { Wallet } from './entities/wallet.entity';
import { IdempotencyRepository } from '../transactions/idempotency.repository';
import {
  TransactionType,
  TransactionStatus,
} from '../transactions/entities/transaction.entity';
import {
  WalletResponse,
  WalletTransactionData,
} from '../../common/interfaces/wallet-response.interface';

@Injectable()
export class WalletsService {
  constructor(
    private readonly walletsRepository: WalletsRepository,
    private readonly idempotencyRepository: IdempotencyRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async getUserWallets(userId: string) {
    const wallets = await this.walletsRepository.findByUser(userId);
    return wallets.map((wallet) => ({
      id: wallet.id,
      currency: wallet.currency,
      balance: Number(wallet.balance),
      isActive: wallet.isActive,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    }));
  }

  async getWalletBalance(userId: string, currency: string) {
    const wallet = await this.walletsRepository.findByUserAndCurrency(
      userId,
      currency,
    );
    if (!wallet) {
      throw new NotFoundException(`Wallet for ${currency} not found`);
    }
    return {
      currency,
      balance: Number(wallet.balance),
      walletId: wallet.id,
    };
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
      const walletRepo = queryRunner.manager.getRepository(Wallet);
      const transactionRepo = queryRunner.manager.getRepository(
        (await import('../transactions/entities/transaction.entity'))
          .Transaction,
      );

      let wallet = await walletRepo.findOne({
        where: { userId, currency, isActive: true },
      });

      if (!wallet) {
        wallet = walletRepo.create({ userId, currency, balance: '0' });
        wallet = await walletRepo.save(wallet);
      }

      const currentBalance = Number(wallet.balance);
      const newBalance = currentBalance + amount;

      await walletRepo.update(wallet.id, {
        balance: newBalance.toString(),
      });

      const reference = `FUND_${Date.now()}_${uuidv4().substring(0, 8)}`;
      const transaction = transactionRepo.create({
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
      const savedTransaction = await transactionRepo.save(transaction);

      await queryRunner.commitTransaction();

      const transactionData: WalletTransactionData = {
        reference: savedTransaction.reference,
        currency,
        amount,
        newBalance,
        timestamp: savedTransaction.completedAt,
      };

      const response: WalletResponse = {
        message: 'Wallet funded successfully',
        data: transactionData,
      };

      await this.idempotencyRepository.updateResponse(
        finalIdempotencyKey,
        response,
        200,
      );

      return response;
    } catch (error) {
      await queryRunner.rollbackTransaction();

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      await this.idempotencyRepository.updateResponse(
        finalIdempotencyKey,
        { error: errorMessage },
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
    if (fromCurrency === toCurrency) {
      throw new BadRequestException(
        'Source and target currencies must be different',
      );
    }

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
      '/wallet/convert',
      { fromCurrency, toCurrency, amount, fxRate },
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const walletRepo = queryRunner.manager.getRepository(Wallet);
      const transactionRepo = queryRunner.manager.getRepository(
        (await import('../transactions/entities/transaction.entity'))
          .Transaction,
      );

      const fromWallet = await walletRepo.findOne({
        where: { userId, currency: fromCurrency, isActive: true },
      });

      if (!fromWallet) {
        throw new BadRequestException(
          `You don't have a ${fromCurrency} wallet`,
        );
      }

      const fromBalance = Number(fromWallet.balance);
      if (fromBalance < amount) {
        throw new BadRequestException(
          `Insufficient ${fromCurrency} balance. You have ${fromBalance} ${fromCurrency}`,
        );
      }

      const targetAmount = Number((amount * fxRate).toFixed(2));
      const newFromBalance = fromBalance - amount;

      await walletRepo.update(fromWallet.id, {
        balance: newFromBalance.toString(),
      });

      let toWallet = await walletRepo.findOne({
        where: { userId, currency: toCurrency, isActive: true },
      });

      if (toWallet) {
        const newToBalance = Number(toWallet.balance) + targetAmount;
        await walletRepo.update(toWallet.id, {
          balance: newToBalance.toString(),
        });
      } else {
        toWallet = walletRepo.create({
          userId,
          currency: toCurrency,
          balance: targetAmount.toString(),
        });
        await walletRepo.save(toWallet);
      }

      const reference = `CONV_${Date.now()}_${uuidv4().substring(0, 8)}`;
      const transaction = transactionRepo.create({
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
      const savedTransaction = await transactionRepo.save(transaction);

      await queryRunner.commitTransaction();

      const transactionData: WalletTransactionData = {
        reference: savedTransaction.reference,
        fromCurrency,
        toCurrency,
        fromAmount: amount,
        toAmount: targetAmount,
        rate: fxRate,
        timestamp: savedTransaction.completedAt,
      };

      const response: WalletResponse = {
        message: 'Currency conversion successful',
        data: transactionData,
      };

      await this.idempotencyRepository.updateResponse(
        finalIdempotencyKey,
        response,
        200,
      );

      return response;
    } catch (error) {
      await queryRunner.rollbackTransaction();

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      await this.idempotencyRepository.updateResponse(
        finalIdempotencyKey,
        { error: errorMessage },
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

    const existingRecord = await this.idempotencyRepository.findValidKey(
      finalIdempotencyKey,
      senderId,
    );

    if (existingRecord) {
      if (existingRecord.responseBody) {
        return existingRecord.responseBody;
      }
      throw new ConflictException('Request already in progress');
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
      const walletRepo = queryRunner.manager.getRepository(Wallet);
      const transactionRepo = queryRunner.manager.getRepository(
        (await import('../transactions/entities/transaction.entity'))
          .Transaction,
      );

      const senderWallet = await walletRepo.findOne({
        where: { userId: senderId, currency, isActive: true },
      });

      if (!senderWallet) {
        throw new BadRequestException(
          `You don't have a ${currency} wallet. Please fund a ${currency} wallet first.`,
        );
      }

      const senderBalance = Number(senderWallet.balance);
      if (senderBalance < amount) {
        throw new BadRequestException(
          `Insufficient ${currency} balance. You have ${senderBalance} ${currency}`,
        );
      }

      let recipientWallet = await walletRepo.findOne({
        where: { userId: recipientId, currency, isActive: true },
      });

      if (!recipientWallet) {
        recipientWallet = walletRepo.create({
          userId: recipientId,
          currency,
          balance: '0',
        });
        recipientWallet = await walletRepo.save(recipientWallet);
      }

      const newSenderBalance = senderBalance - amount;
      const newRecipientBalance = Number(recipientWallet.balance) + amount;

      await walletRepo.update(senderWallet.id, {
        balance: newSenderBalance.toString(),
      });
      await walletRepo.update(recipientWallet.id, {
        balance: newRecipientBalance.toString(),
      });

      const reference = `TRF_${Date.now()}_${uuidv4().substring(0, 8)}`;
      const transaction = transactionRepo.create({
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
      const savedTransaction = await transactionRepo.save(transaction);

      await queryRunner.commitTransaction();

      const transactionData: WalletTransactionData = {
        reference: savedTransaction.reference,
        currency,
        amount,
        newBalance: newSenderBalance,
        timestamp: savedTransaction.completedAt,
      };

      const response: WalletResponse = {
        message: 'Transfer successful',
        data: transactionData,
      };

      await this.idempotencyRepository.updateResponse(
        finalIdempotencyKey,
        response,
        200,
      );

      return response;
    } catch (error) {
      await queryRunner.rollbackTransaction();

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      await this.idempotencyRepository.updateResponse(
        finalIdempotencyKey,
        { error: errorMessage },
        500,
      );

      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
