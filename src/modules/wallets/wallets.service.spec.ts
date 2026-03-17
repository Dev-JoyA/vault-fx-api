import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { WalletsService } from './wallets.service';
import { WalletsRepository } from './wallets.repository';
import { TransactionsRepository } from '../transactions/transactions.repository';
import { IdempotencyRepository } from '../transactions/idempotency.repository';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('WalletsService', () => {
  let service: WalletsService;

  const mockWalletsRepository = {
    findByUserAndCurrency: jest.fn(),
    create: jest.fn(),
    updateBalance: jest.fn(),
    findByUser: jest.fn(),
  };

  const mockTransactionsRepository = {
    create: jest.fn(),
  };

  const mockIdempotencyRepository = {
    findValidKey: jest.fn(),
    createRecord: jest.fn(),
    updateResponse: jest.fn(),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
  };

  const mockDataSource = {
    createQueryRunner: jest.fn(),
  };

  const mockWallet = {
    id: 'wallet-id',
    userId: 'user-id',
    currency: 'NGN',
    balance: '1000',
    isActive: true,
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    mockDataSource.createQueryRunner.mockReturnValue(mockQueryRunner);
    mockQueryRunner.connect.mockResolvedValue(undefined);
    mockQueryRunner.startTransaction.mockResolvedValue(undefined);
    mockQueryRunner.commitTransaction.mockResolvedValue(undefined);
    mockQueryRunner.rollbackTransaction.mockResolvedValue(undefined);
    mockQueryRunner.release.mockResolvedValue(undefined);
    mockIdempotencyRepository.createRecord.mockResolvedValue({});
    mockIdempotencyRepository.updateResponse.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletsService,
        { provide: WalletsRepository, useValue: mockWalletsRepository },
        { provide: TransactionsRepository, useValue: mockTransactionsRepository },
        { provide: IdempotencyRepository, useValue: mockIdempotencyRepository },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<WalletsService>(WalletsService);
  });

  describe('getUserWallets', () => {
    it('should return user wallets with number balances', async () => {
      const mockWallets = [
        { ...mockWallet, currency: 'NGN', balance: '1000' },
        { ...mockWallet, currency: 'USD', balance: '500' },
      ];

      mockWalletsRepository.findByUser.mockResolvedValue(mockWallets);

      const result = await service.getUserWallets('user-id');

      expect(result).toHaveLength(2);
      expect(result[0].balance).toBe(1000);
      expect(result[1].balance).toBe(500);
    });
  });

  describe('getWalletBalance', () => {
    it('should return wallet balance as number', async () => {
      mockWalletsRepository.findByUserAndCurrency.mockResolvedValue(mockWallet);

      const result = await service.getWalletBalance('user-id', 'NGN');

      expect(result).toEqual({
        currency: 'NGN',
        balance: 1000,
        walletId: 'wallet-id',
      });
    });

    it('should throw NotFoundException if wallet not found', async () => {
      mockWalletsRepository.findByUserAndCurrency.mockResolvedValue(null);

      await expect(service.getWalletBalance('user-id', 'NGN')).rejects.toThrow(NotFoundException);
    });
  });

  describe('fundWallet', () => {
    it('should successfully fund wallet', async () => {
      mockIdempotencyRepository.findValidKey.mockResolvedValue(null);
      mockWalletsRepository.findByUserAndCurrency.mockResolvedValue(mockWallet);
      mockTransactionsRepository.create.mockResolvedValue({
        reference: 'FUND_12345',
        completedAt: new Date(),
      });

      const result = await service.fundWallet('user-id', 'NGN', 500);

      expect((result as any).message).toBe('Wallet funded successfully');
      expect((result as any).transaction.amount).toBe(500);
      expect((result as any).transaction.reference).toBeDefined();
    });

    it('should create wallet if it does not exist', async () => {
      const newWallet = { ...mockWallet, balance: '0' };

      mockIdempotencyRepository.findValidKey.mockResolvedValue(null);
      mockTransactionsRepository.create.mockResolvedValue({
        reference: 'FUND_12345',
        completedAt: new Date(),
      });
      mockWalletsRepository.findByUserAndCurrency.mockResolvedValue(null);
      mockWalletsRepository.create.mockResolvedValue(newWallet);

      await service.fundWallet('user-id', 'NGN', 500);

      expect(mockWalletsRepository.create).toHaveBeenCalledWith('user-id', 'NGN');
    });
  });

  describe('convertCurrency', () => {
    it('should throw BadRequestException if source wallet not found', async () => {
      mockIdempotencyRepository.findValidKey.mockResolvedValue(null);
      mockWalletsRepository.findByUserAndCurrency.mockResolvedValue(null);

      await expect(
        service.convertCurrency('user-id', 'NGN', 'USD', 500, 0.00066)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('transferToUser', () => {
    const senderId = 'sender-123';
    const recipientId = 'recipient-456';
    const currency = 'USD';
    const amount = 500;

    const senderWallet = {
      id: 'sender-wallet-id',
      userId: senderId,
      currency: 'USD',
      balance: '1000',
      isActive: true,
    };

    const recipientWallet = {
      id: 'recipient-wallet-id',
      userId: recipientId,
      currency: 'USD',
      balance: '200',
      isActive: true,
    };

    const mockTransaction = {
      reference: 'TRF_12345',
      completedAt: new Date(),
    };

    it('should successfully transfer funds to existing recipient wallet', async () => {
      mockIdempotencyRepository.findValidKey.mockResolvedValue(null);
      mockWalletsRepository.findByUserAndCurrency
        .mockResolvedValueOnce(senderWallet)
        .mockResolvedValueOnce(recipientWallet);
      mockWalletsRepository.updateBalance.mockResolvedValue(undefined);
      mockTransactionsRepository.create.mockResolvedValue(mockTransaction);

      const result = await service.transferToUser(senderId, recipientId, currency, amount);

      expect((result as any).message).toBe('Transfer successful');
      expect((result as any).data.amount).toBe(amount);
      expect((result as any).data.currency).toBe(currency);
      expect((result as any).data.recipientId).toBe(recipientId);
      expect((result as any).data.reference).toBeDefined();
      expect(mockWalletsRepository.updateBalance).toHaveBeenCalledWith('sender-wallet-id', 500);
      expect(mockWalletsRepository.updateBalance).toHaveBeenCalledWith('recipient-wallet-id', 700);
    });

    it('should auto-create wallet for recipient if they dont have one', async () => {
      const newRecipientWallet = {
        id: 'new-wallet-id',
        userId: recipientId,
        currency: 'USD',
        balance: '0',
        isActive: true,
      };

      mockIdempotencyRepository.findValidKey.mockResolvedValue(null);
      mockWalletsRepository.findByUserAndCurrency
        .mockResolvedValueOnce(senderWallet)
        .mockResolvedValueOnce(null);
      mockWalletsRepository.create.mockResolvedValue(newRecipientWallet);
      mockWalletsRepository.updateBalance.mockResolvedValue(undefined);
      mockTransactionsRepository.create.mockResolvedValue(mockTransaction);

      const result = await service.transferToUser(senderId, recipientId, currency, amount);

      expect((result as any).message).toBe('Transfer successful');
      expect(mockWalletsRepository.create).toHaveBeenCalledWith(recipientId, currency);
      expect(mockWalletsRepository.updateBalance).toHaveBeenCalledWith('sender-wallet-id', 500);
      expect(mockWalletsRepository.updateBalance).toHaveBeenCalledWith('new-wallet-id', 500);
    });

    it('should throw BadRequestException when sending to yourself', async () => {
      await expect(
        service.transferToUser(senderId, senderId, currency, amount)
      ).rejects.toThrow('Cannot transfer to yourself');

      expect(mockWalletsRepository.findByUserAndCurrency).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if sender has no wallet for that currency', async () => {
      mockIdempotencyRepository.findValidKey.mockResolvedValue(null);
      mockWalletsRepository.findByUserAndCurrency.mockResolvedValue(null);

      await expect(
        service.transferToUser(senderId, recipientId, currency, amount)
      ).rejects.toThrow(`You don't have a ${currency} wallet`);
    });

    it('should throw BadRequestException if sender has insufficient balance', async () => {
      mockIdempotencyRepository.findValidKey.mockResolvedValue(null);
      const lowBalanceWallet = { ...senderWallet, balance: '100' };
      mockWalletsRepository.findByUserAndCurrency.mockResolvedValueOnce(lowBalanceWallet);

      await expect(
        service.transferToUser(senderId, recipientId, currency, 500)
      ).rejects.toThrow(`Insufficient ${currency} balance`);
    });

    it('should return cached response if idempotency key exists', async () => {
      const cachedResponse = {
        message: 'Transfer successful',
        data: { reference: 'cached-ref' },
      };

      mockIdempotencyRepository.findValidKey.mockResolvedValue({
        responseBody: cachedResponse,
      });

      const result = await service.transferToUser(
        senderId, recipientId, currency, amount, 'existing-key'
      );

      expect(result).toEqual(cachedResponse);
      expect(mockWalletsRepository.findByUserAndCurrency).not.toHaveBeenCalled();
    });

    it('should handle transaction rollback on error', async () => {
      mockIdempotencyRepository.findValidKey.mockResolvedValue(null);
      mockWalletsRepository.findByUserAndCurrency
        .mockResolvedValueOnce(senderWallet)
        .mockResolvedValueOnce(recipientWallet);
      mockWalletsRepository.updateBalance.mockRejectedValue(new Error('Database error'));

      await expect(
        service.transferToUser(senderId, recipientId, currency, amount)
      ).rejects.toThrow('Database error');

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should handle different currencies correctly', async () => {
      const eurSenderWallet = {
        id: 'eur-sender-wallet-id',
        userId: senderId,
        currency: 'EUR',
        balance: '1000',
        isActive: true,
      };
      const eurRecipientWallet = {
        id: 'eur-recipient-wallet-id',
        userId: recipientId,
        currency: 'EUR',
        balance: '300',
        isActive: true,
      };

      mockIdempotencyRepository.findValidKey.mockResolvedValue(null);
      mockWalletsRepository.findByUserAndCurrency
        .mockResolvedValueOnce(eurSenderWallet)
        .mockResolvedValueOnce(eurRecipientWallet);
      mockWalletsRepository.updateBalance.mockResolvedValue(undefined);
      mockTransactionsRepository.create.mockResolvedValue(mockTransaction);

      const result = await service.transferToUser(senderId, recipientId, 'EUR', 300);

      expect((result as any).message).toBe('Transfer successful');
      expect((result as any).data.currency).toBe('EUR');
      expect((result as any).data.amount).toBe(300);
      expect(mockWalletsRepository.updateBalance).toHaveBeenCalledWith('eur-sender-wallet-id', 700);
      expect(mockWalletsRepository.updateBalance).toHaveBeenCalledWith('eur-recipient-wallet-id', 600);
    });

    it('should handle large transfers correctly', async () => {
      const largeAmount = 1000000;
      const richSenderWallet = { ...senderWallet, balance: largeAmount.toString() };

      mockIdempotencyRepository.findValidKey.mockResolvedValue(null);
      mockWalletsRepository.findByUserAndCurrency
        .mockResolvedValueOnce(richSenderWallet)
        .mockResolvedValueOnce(recipientWallet);
      mockWalletsRepository.updateBalance.mockResolvedValue(undefined);
      mockTransactionsRepository.create.mockResolvedValue(mockTransaction);

      const result = await service.transferToUser(senderId, recipientId, currency, largeAmount);

      expect((result as any).message).toBe('Transfer successful');
      expect((result as any).data.amount).toBe(largeAmount);
      expect(mockWalletsRepository.updateBalance).toHaveBeenCalledWith('sender-wallet-id', 0);
    });

    it('should preserve decimal precision correctly', async () => {
      const preciseAmount = 500.75;
      const senderWithDecimals = { ...senderWallet, balance: '1000.50' };
      const recipientWithDecimals = { ...recipientWallet, balance: '200.25' };

      mockIdempotencyRepository.findValidKey.mockResolvedValue(null);
      mockWalletsRepository.findByUserAndCurrency
        .mockResolvedValueOnce(senderWithDecimals)
        .mockResolvedValueOnce(recipientWithDecimals);
      mockWalletsRepository.updateBalance.mockResolvedValue(undefined);
      mockTransactionsRepository.create.mockResolvedValue(mockTransaction);

      await service.transferToUser(senderId, recipientId, currency, preciseAmount);

      expect(mockWalletsRepository.updateBalance).toHaveBeenCalledWith('sender-wallet-id', 499.75);
      expect(mockWalletsRepository.updateBalance).toHaveBeenCalledWith('recipient-wallet-id', 701.00);
    });
  });
});