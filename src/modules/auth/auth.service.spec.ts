import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { UsersRepository } from '../users/users.repository';
import { EmailService } from '../email/email.service';
import { WalletsRepository } from '../wallets/wallets.repository';
import {
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    passwordHash: 'hashedPassword',
    isVerified: false,
    role: 'user',
  };

  const mockUsersRepository = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    verifyUser: jest.fn(),
    updateLastLogin: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
  };

  const mockAuthRepository = {
    recordLoginAttempt: jest.fn(),
    getRecentFailedAttempts: jest.fn(),
    revokeAllUserTokens: jest.fn(),
    createRefreshToken: jest.fn(),
    findValidRefreshToken: jest.fn(),
    revokeRefreshToken: jest.fn(),
  };

  const mockEmailService = {
    sendVerificationEmail: jest.fn(),
    verifyOtp: jest.fn(),
    sendWelcomeEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    verifyPasswordResetOtp: jest.fn(),
    resendVerificationOtp: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mockAccessToken'),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, any> = {
        'bcrypt.rounds': 12,
        'jwt.refreshExpiresIn': '7d',
        'wallet.initialBalance': 1000,
      };
      return config[key];
    }),
  };

  const mockWalletsRepository = {
    findByUserAndCurrency: jest.fn(),
    create: jest.fn(),
    updateBalance: jest.fn(),
    findByUser: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    mockJwtService.sign.mockReturnValue('mockAccessToken');
    mockConfigService.get.mockImplementation((key: string) => {
      const config: Record<string, any> = {
        'bcrypt.rounds': 12,
        'jwt.refreshExpiresIn': '7d',
        'wallet.initialBalance': 1000,
      };
      return config[key];
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersRepository, useValue: mockUsersRepository },
        { provide: AuthRepository, useValue: mockAuthRepository },
        { provide: EmailService, useValue: mockEmailService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: WalletsRepository, useValue: mockWalletsRepository },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue(null);
      mockUsersRepository.create.mockResolvedValue({
        id: 'new-id',
        email: 'new@example.com',
      });
      mockEmailService.sendVerificationEmail.mockResolvedValue(undefined);
      mockAuthRepository.recordLoginAttempt.mockResolvedValue(undefined);

      const result = await service.register({
        email: 'new@example.com',
        password: 'Test@123456',
      });

      expect(result.message).toContain('Registration successful');
      expect(mockUsersRepository.create).toHaveBeenCalled();
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalled();
    });

    it('should throw ConflictException if user already exists', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.register({
          email: 'existing@example.com',
          password: 'Test@123456',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('verifyEmail', () => {
    it('should successfully verify email and create NGN wallet', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        isVerified: false,
      });
      mockEmailService.verifyOtp.mockResolvedValue(true);
      mockUsersRepository.verifyUser.mockResolvedValue(undefined);
      mockWalletsRepository.findByUserAndCurrency.mockResolvedValue(null);
      mockWalletsRepository.create.mockResolvedValue({
        id: 'wallet-id',
        userId: mockUser.id,
        currency: 'NGN',
        balance: '1000',
      });
      mockEmailService.sendWelcomeEmail.mockResolvedValue(undefined);

      const result = await service.verifyEmail({
        email: 'test@example.com',
        otp: '123456',
      });

      expect(result.message).toContain('Email verified successfully');
      expect(mockUsersRepository.verifyUser).toHaveBeenCalled();
      expect(mockWalletsRepository.create).toHaveBeenCalledWith(
        mockUser.id,
        'NGN',
        1000,
      );
    });

    it('should not create wallet if NGN wallet already exists', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        isVerified: false,
      });
      mockEmailService.verifyOtp.mockResolvedValue(true);
      mockUsersRepository.verifyUser.mockResolvedValue(undefined);
      mockWalletsRepository.findByUserAndCurrency.mockResolvedValue({
        id: 'existing-wallet',
      });
      mockEmailService.sendWelcomeEmail.mockResolvedValue(undefined);

      await service.verifyEmail({ email: 'test@example.com', otp: '123456' });

      expect(mockWalletsRepository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if user not found', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue(null);

      await expect(
        service.verifyEmail({
          email: 'nonexistent@example.com',
          otp: '123456',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if OTP invalid', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        isVerified: false,
      });
      mockEmailService.verifyOtp.mockResolvedValue(false);

      await expect(
        service.verifyEmail({ email: 'test@example.com', otp: 'wrong-otp' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if email already verified', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        isVerified: true,
      });

      await expect(
        service.verifyEmail({ email: 'test@example.com', otp: '123456' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    it('should successfully login a verified user', async () => {
      const verifiedUser = { ...mockUser, isVerified: true };

      mockAuthRepository.getRecentFailedAttempts.mockResolvedValue(0);
      mockUsersRepository.findByEmail.mockResolvedValue(verifiedUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      mockAuthRepository.revokeAllUserTokens.mockResolvedValue(undefined);
      mockAuthRepository.createRefreshToken.mockResolvedValue({});
      mockUsersRepository.updateLastLogin.mockResolvedValue(undefined);
      mockAuthRepository.recordLoginAttempt.mockResolvedValue(undefined);

      const result = await service.login({
        email: 'test@example.com',
        password: 'Test@123456',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).toBeDefined();
      expect((result.user as any).passwordHash).toBeUndefined();
    });

    it('should throw UnauthorizedException after too many failed attempts', async () => {
      mockAuthRepository.getRecentFailedAttempts.mockResolvedValue(5);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockAuthRepository.getRecentFailedAttempts.mockResolvedValue(0);
      mockUsersRepository.findByEmail.mockResolvedValue(null);
      mockAuthRepository.recordLoginAttempt.mockResolvedValue(undefined);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'Test@123456' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user not verified', async () => {
      mockAuthRepository.getRecentFailedAttempts.mockResolvedValue(0);
      mockUsersRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        isVerified: false,
      });
      mockAuthRepository.recordLoginAttempt.mockResolvedValue(undefined);

      await expect(
        service.login({ email: 'test@example.com', password: 'Test@123456' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is wrong', async () => {
      mockAuthRepository.getRecentFailedAttempts.mockResolvedValue(0);
      mockUsersRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        isVerified: true,
      });
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
      mockAuthRepository.recordLoginAttempt.mockResolvedValue(undefined);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should revoke specific refresh token when provided', async () => {
      const tokenEntity = { id: 'token-id' };
      mockAuthRepository.findValidRefreshToken.mockResolvedValue(tokenEntity);
      mockAuthRepository.revokeRefreshToken.mockResolvedValue(undefined);

      const result = await service.logout('user-id', 'some-refresh-token');

      expect(result.message).toBe('Logged out successfully');
      expect(mockAuthRepository.revokeRefreshToken).toHaveBeenCalledWith(
        'token-id',
      );
    });

    it('should revoke all tokens when no refresh token provided', async () => {
      mockAuthRepository.revokeAllUserTokens.mockResolvedValue(undefined);

      const result = await service.logout('user-id');

      expect(result.message).toBe('Logged out successfully');
      expect(mockAuthRepository.revokeAllUserTokens).toHaveBeenCalledWith(
        'user-id',
      );
    });
  });

  describe('forgotPassword', () => {
    it('should return safe message even if user does not exist', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword({
        email: 'nobody@example.com',
      });

      expect(result.message).toContain('If a user with that email exists');
      expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should send reset email if user exists', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue(mockUser);
      mockEmailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      const result = await service.forgotPassword({
        email: 'test@example.com',
      });

      expect(result.message).toContain('If a user with that email exists');
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.email,
      );
    });
  });
});
