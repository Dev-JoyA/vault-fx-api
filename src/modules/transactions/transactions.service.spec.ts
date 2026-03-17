import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { TransactionsRepository } from './transactions.repository';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('TransactionsService', () => {
  let service: TransactionsService;

  const mockTransactions = [
    {
      id: '1',
      userId: 'user-id',
      type: 'FUND',
      status: 'COMPLETED',
      sourceCurrency: 'NGN',
      sourceAmount: '1000',
      reference: 'REF123',
      createdAt: new Date(),
      completedAt: new Date(),
    },
    {
      id: '2',
      userId: 'user-id',
      type: 'CONVERT',
      status: 'COMPLETED',
      sourceCurrency: 'NGN',
      targetCurrency: 'USD',
      sourceAmount: '500',
      targetAmount: '0.33',
      fxRate: '0.00066',
      reference: 'REF456',
      createdAt: new Date(),
      completedAt: new Date(),
    },
  ];

  const mockTransactionsRepository = {
    findByUserWithFilters: jest.fn(),
    findByReference: jest.fn(),
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: TransactionsRepository, useValue: mockTransactionsRepository },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  describe('getUserTransactions', () => {
    it('should return paginated transactions', async () => {
      mockTransactionsRepository.findByUserWithFilters.mockResolvedValue([mockTransactions, 2]);

      const result = await service.getUserTransactions('user-id', { page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });

    it('should throw BadRequestException if fromDate after toDate', async () => {
      await expect(
        service.getUserTransactions('user-id', {
          fromDate: '2024-01-02',
          toDate: '2024-01-01',
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getTransactionByReference', () => {
    it('should return transaction if found and belongs to user', async () => {
      mockTransactionsRepository.findByReference.mockResolvedValue(mockTransactions[0]);

      const result = await service.getTransactionByReference('user-id', 'REF123');

      expect(result).toBeDefined();
      expect(result.reference).toBe('REF123');
    });

    it('should throw NotFoundException if transaction not found', async () => {
      mockTransactionsRepository.findByReference.mockResolvedValue(null);

      await expect(
        service.getTransactionByReference('user-id', 'INVALID')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTransactionById', () => {
    it('should return transaction if found and belongs to user', async () => {
      mockTransactionsRepository.findById.mockResolvedValue(mockTransactions[0]);

      const result = await service.getTransactionById('user-id', '1');

      expect(result).toBeDefined();
      expect(result.id).toBe('1');
    });

    it('should throw NotFoundException if transaction not found', async () => {
      mockTransactionsRepository.findById.mockResolvedValue(null);

      await expect(service.getTransactionById('user-id', '999')).rejects.toThrow(NotFoundException);
    });
  });
});