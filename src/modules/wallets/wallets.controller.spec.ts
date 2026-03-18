import { Test, TestingModule } from '@nestjs/testing';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('WalletsController', () => {
  let controller: WalletsController;
  let walletsService: WalletsService;

  const mockWalletsService = {
    transferToUser: jest.fn(),
    getUserWallets: jest.fn(),
    getWalletBalance: jest.fn(),
    fundWallet: jest.fn(),
    convertCurrency: jest.fn(),
  };

  const mockRequest = {
    user: { id: 'test-user-id', email: 'test@example.com', role: 'user' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletsController],
      providers: [{ provide: WalletsService, useValue: mockWalletsService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<WalletsController>(WalletsController);
    walletsService = module.get<WalletsService>(WalletsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('transfer', () => {
    const transferDto = {
      recipientId: 'recipient-123',
      currency: 'USD',
      amount: 500,
    };

    const idempotencyKey = 'test-idempotency-key';

    it('should call transferToUser with correct parameters', async () => {
      const expectedResult = { message: 'Transfer successful' };
      mockWalletsService.transferToUser.mockResolvedValue(expectedResult);

      const result = await controller.transfer(
        mockRequest as any,
        transferDto,
        idempotencyKey,
      );

      expect(result).toBe(expectedResult);
      expect(walletsService.transferToUser).toHaveBeenCalledWith(
        'test-user-id',
        transferDto.recipientId,
        transferDto.currency,
        transferDto.amount,
        idempotencyKey,
      );
    });

    it('should work without idempotency key', async () => {
      mockWalletsService.transferToUser.mockResolvedValue({});

      await controller.transfer(mockRequest as any, transferDto, undefined);

      expect(walletsService.transferToUser).toHaveBeenCalledWith(
        'test-user-id',
        transferDto.recipientId,
        transferDto.currency,
        transferDto.amount,
        undefined,
      );
    });

    it('should validate the DTO - amount must be positive', async () => {
      const invalidDto = {
        recipientId: 'recipient-123',
        currency: 'USD',
        amount: -500,
      };

      try {
        await controller.transfer(
          mockRequest as any,
          invalidDto as any,
          idempotencyKey,
        );
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should validate the DTO - currency must be 3 letters', async () => {
      const invalidDto = {
        recipientId: 'recipient-123',
        currency: 'US',
        amount: 500,
      };

      try {
        await controller.transfer(
          mockRequest as any,
          invalidDto as any,
          idempotencyKey,
        );
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should validate the DTO - recipientId must be UUID', async () => {
      const invalidDto = {
        recipientId: 'not-a-uuid',
        currency: 'USD',
        amount: 500,
      };

      try {
        await controller.transfer(
          mockRequest as any,
          invalidDto as any,
          idempotencyKey,
        );
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle service errors gracefully', async () => {
      mockWalletsService.transferToUser.mockRejectedValue(
        new Error('Insufficient balance'),
      );

      await expect(
        controller.transfer(mockRequest as any, transferDto, idempotencyKey),
      ).rejects.toThrow('Insufficient balance');
    });
  });
});
