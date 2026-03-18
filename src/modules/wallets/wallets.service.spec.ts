import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { WalletsService } from './wallets.service';
import { WalletsRepository } from './wallets.repository';
import { IdempotencyRepository } from '../transactions/idempotency.repository';
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

describe('WalletsService', () => {
  let service: WalletsService;

  const mockWalletsRepository = {
    findByUserAndCurrency: jest.fn(),
    create: jest.fn(),
    updateBalance: jest.fn(),
    findByUser: jest.fn(),
  };

  const mockIdempotencyRepository = {
    findValidKey: jest.fn(),
    createRecord: jest.fn(),
    updateResponse: jest.fn(),
  };

  const mockWalletRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockTransactionRepo = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      getRepository: jest.fn(),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    mockDataSource.createQueryRunner.mockReturnValue(mockQueryRunner);
    mockQueryRunner.connect.mockResolvedValue(undefined);
    mockQueryRunner.startTransaction.mockResolvedValue(undefined);
    mockQueryRunner.commitTransaction.mockResolvedValue(undefined);
    mockQueryRunner.rollbackTransaction.mockResolvedValue(undefined);
    mockQueryRunner.release.mockResolvedValue(undefined);

    mockQueryRunner.manager.getRepository.mockImplementation((entity: any) => {
      const name =
        typeof entity === 'function' ? entity.name : (entity?.name ?? '');
      if (name === 'Wallet') return mockWalletRepo;
      return mockTransactionRepo;
    });

    mockIdempotencyRepository.createRecord.mockResolvedValue({});
    mockIdempotencyRepository.updateResponse.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletsService,
        { provide: WalletsRepository, useValue: mockWalletsRepository },
        { provide: IdempotencyRepository, useValue: mockIdempotencyRepository },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<WalletsService>(WalletsService);
  });

  describe('getUserWallets', () => {
    it('should return wallets with numeric balances', async () => {
      const mockWallets = [
        {
          id: '1',
          currency: 'NGN',
          balance: '1000',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          currency: 'USD',
          balance: '500.50',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockWalletsRepository.findByUser.mockResolvedValue(mockWallets);

      const result = await service.getUserWallets('user-id');

      expect(result).toHaveLength(2);
      expect(result[0].balance).toBe(1000);
      expect(result[1].balance).toBe(500.5);
    });
  });

  describe('getWalletBalance', () => {
    it('should return wallet balance', async () => {
      mockWalletsRepository.findByUserAndCurrency.mockResolvedValue({
        id: 'wallet-id',
        currency: 'NGN',
        balance: '1000',
      });

      const result = await service.getWalletBalance('user-id', 'NGN');

      expect(result).toEqual({
        currency: 'NGN',
        balance: 1000,
        walletId: 'wallet-id',
      });
    });

    it('should throw NotFoundException if wallet not found', async () => {
      mockWalletsRepository.findByUserAndCurrency.mockResolvedValue(null);

      await expect(service.getWalletBalance('user-id', 'NGN')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('fundWallet', () => {
    const mockWallet = {
      id: 'wallet-id',
      userId: 'user-id',
      currency: 'NGN',
      balance: '1000',
      isActive: true,
    };
    const mockSavedTransaction = {
      reference: 'FUND_12345',
      completedAt: new Date(),
    };

    it('should successfully fund wallet', async () => {
      mockIdempotencyRepository.findValidKey.mockResolvedValue(null);
      mockWalletRepo.findOne.mockResolvedValue(mockWallet);
      mockWalletRepo.update.mockResolvedValue(undefined);
      mockTransactionRepo.create.mockReturnValue(mockSavedTransaction);
      mockTransactionRepo.save.mockResolvedValue(mockSavedTransaction);

      const result = await service.fundWallet('user-id', 'NGN', 500);

      expect((result as any).message).toBe('Wallet funded successfully');
      expect((result as any).data.amount).toBe(500);
      expect((result as any).data.newBalance).toBe(1500);
    });

    it('should create wallet if it does not exist', async () => {
      const newWallet = {
        id: 'new-wallet-id',
        userId: 'user-id',
        currency: 'NGN',
        balance: '0',
        isActive: true,
      };

      mockIdempotencyRepository.findValidKey.mockResolvedValue(null);
      mockWalletRepo.findOne.mockResolvedValue(null);
      mockWalletRepo.create.mockReturnValue(newWallet);
      mockWalletRepo.save.mockResolvedValue(newWallet);
      mockWalletRepo.update.mockResolvedValue(undefined);
      mockTransactionRepo.create.mockReturnValue(mockSavedTransaction);
      mockTransactionRepo.save.mockResolvedValue(mockSavedTransaction);

      await service.fundWallet('user-id', 'NGN', 500);

      expect(mockWalletRepo.create).toHaveBeenCalledWith({
        userId: 'user-id',
        currency: 'NGN',
        balance: '0',
      });
    });

    it('should return cached response if idempotency key exists', async () => {
      const cachedResponse = {
        message: 'Wallet funded successfully',
        data: { amount: 500 },
      };
      mockIdempotencyRepository.findValidKey.mockResolvedValue({
        responseBody: cachedResponse,
      });

      const result = await service.fundWallet(
        'user-id',
        'NGN',
        500,
        'existing-key',
      );

      expect(result).toEqual(cachedResponse);
      expect(mockWalletRepo.findOne).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if request already in progress', async () => {
      mockIdempotencyRepository.findValidKey.mockResolvedValue({
        responseBody: null,
      });

      await expect(service.fundWallet('user-id', 'NGN', 500)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('convertCurrency', () => {
    it('should throw BadRequestException if source wallet not found', async () => {
      mockIdempotencyRepository.findValidKey.mockResolvedValue(null);
      mockWalletRepo.findOne.mockResolvedValue(null);

      await expect(
        service.convertCurrency('user-id', 'NGN', 'USD', 500, 0.00066),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if insufficient balance', async () => {
      mockIdempotencyRepository.findValidKey.mockResolvedValue(null);
      mockWalletRepo.findOne.mockResolvedValueOnce({
        id: 'wallet-id',
        currency: 'NGN',
        balance: '100',
        isActive: true,
      });

      await expect(
        service.convertCurrency('user-id', 'NGN', 'USD', 500, 0.00066),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if same currency', async () => {
      await expect(
        service.convertCurrency('user-id', 'NGN', 'NGN', 500, 1),
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
      currency,
      balance: '1000',
      isActive: true,
    };
    const recipientWallet = {
      id: 'recipient-wallet-id',
      userId: recipientId,
      currency,
      balance: '200',
      isActive: true,
    };
    const mockSavedTransaction = {
      reference: 'TRF_12345',
      completedAt: new Date(),
    };

    it('should successfully transfer funds', async () => {
      mockIdempotencyRepository.findValidKey.mockResolvedValue(null);
      mockWalletRepo.findOne
        .mockResolvedValueOnce(senderWallet)
        .mockResolvedValueOnce(recipientWallet);
      mockWalletRepo.update.mockResolvedValue(undefined);
      mockTransactionRepo.create.mockReturnValue(mockSavedTransaction);
      mockTransactionRepo.save.mockResolvedValue(mockSavedTransaction);

      const result = await service.transferToUser(
        senderId,
        recipientId,
        currency,
        amount,
      );

      expect((result as any).message).toBe('Transfer successful');
      expect((result as any).data.amount).toBe(amount);
      expect(mockWalletRepo.update).toHaveBeenCalledWith('sender-wallet-id', {
        balance: '500',
      });
      expect(mockWalletRepo.update).toHaveBeenCalledWith(
        'recipient-wallet-id',
        { balance: '700' },
      );
    });

    it('should auto-create wallet for recipient if they dont have one', async () => {
      const newRecipientWallet = {
        id: 'new-wallet-id',
        userId: recipientId,
        currency,
        balance: '0',
        isActive: true,
      };

      mockIdempotencyRepository.findValidKey.mockResolvedValue(null);
      mockWalletRepo.findOne
        .mockResolvedValueOnce(senderWallet)
        .mockResolvedValueOnce(null);
      mockWalletRepo.create.mockReturnValue(newRecipientWallet);
      mockWalletRepo.save.mockResolvedValue(newRecipientWallet);
      mockWalletRepo.update.mockResolvedValue(undefined);
      mockTransactionRepo.create.mockReturnValue(mockSavedTransaction);
      mockTransactionRepo.save.mockResolvedValue(mockSavedTransaction);

      await service.transferToUser(senderId, recipientId, currency, amount);

      expect(mockWalletRepo.create).toHaveBeenCalledWith({
        userId: recipientId,
        currency,
        balance: '0',
      });
    });

    it('should throw BadRequestException when sending to yourself', async () => {
      await expect(
        service.transferToUser(senderId, senderId, currency, amount),
      ).rejects.toThrow('Cannot transfer to yourself');
    });

    it('should throw BadRequestException if sender has no wallet', async () => {
      mockIdempotencyRepository.findValidKey.mockResolvedValue(null);
      mockWalletRepo.findOne.mockResolvedValue(null);

      await expect(
        service.transferToUser(senderId, recipientId, currency, amount),
      ).rejects.toThrow(`You don't have a ${currency} wallet`);
    });

    it('should throw BadRequestException if insufficient balance', async () => {
      mockIdempotencyRepository.findValidKey.mockResolvedValue(null);
      mockWalletRepo.findOne.mockResolvedValueOnce({
        ...senderWallet,
        balance: '100',
      });

      await expect(
        service.transferToUser(senderId, recipientId, currency, 500),
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
        senderId,
        recipientId,
        currency,
        amount,
        'existing-key',
      );

      expect(result).toEqual(cachedResponse);
      expect(mockWalletRepo.findOne).not.toHaveBeenCalled();
    });

    it('should handle transaction rollback on error', async () => {
      mockIdempotencyRepository.findValidKey.mockResolvedValue(null);
      mockWalletRepo.findOne
        .mockResolvedValueOnce(senderWallet)
        .mockResolvedValueOnce(recipientWallet);
      mockWalletRepo.update.mockRejectedValue(new Error('Database error'));

      await expect(
        service.transferToUser(senderId, recipientId, currency, amount),
      ).rejects.toThrow('Database error');

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should handle large transfers correctly', async () => {
      const largeAmount = 1000000;
      const richSenderWallet = {
        ...senderWallet,
        balance: largeAmount.toString(),
      };

      mockIdempotencyRepository.findValidKey.mockResolvedValue(null);
      mockWalletRepo.findOne
        .mockResolvedValueOnce(richSenderWallet)
        .mockResolvedValueOnce(recipientWallet);
      mockWalletRepo.update.mockResolvedValue(undefined);
      mockTransactionRepo.create.mockReturnValue(mockSavedTransaction);
      mockTransactionRepo.save.mockResolvedValue(mockSavedTransaction);

      const result = await service.transferToUser(
        senderId,
        recipientId,
        currency,
        largeAmount,
      );

      expect((result as any).message).toBe('Transfer successful');
      expect(mockWalletRepo.update).toHaveBeenCalledWith('sender-wallet-id', {
        balance: '0',
      });
    });

    it('should preserve decimal precision', async () => {
      const preciseAmount = 500.75;
      const senderWithDecimals = { ...senderWallet, balance: '1000.50' };
      const recipientWithDecimals = { ...recipientWallet, balance: '200.25' };

      mockIdempotencyRepository.findValidKey.mockResolvedValue(null);
      mockWalletRepo.findOne
        .mockResolvedValueOnce(senderWithDecimals)
        .mockResolvedValueOnce(recipientWithDecimals);
      mockWalletRepo.update.mockResolvedValue(undefined);
      mockTransactionRepo.create.mockReturnValue(mockSavedTransaction);
      mockTransactionRepo.save.mockResolvedValue(mockSavedTransaction);

      await service.transferToUser(
        senderId,
        recipientId,
        currency,
        preciseAmount,
      );

      expect(mockWalletRepo.update).toHaveBeenCalledWith('sender-wallet-id', {
        balance: '499.75',
      });
      expect(mockWalletRepo.update).toHaveBeenCalledWith(
        'recipient-wallet-id',
        { balance: '701' },
      );
    });
  });
});
