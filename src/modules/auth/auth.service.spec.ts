import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { UsersRepository } from '../users/users.repository';
import { EmailService } from '../email/email.service';
import { ConflictException, BadRequestException, UnauthorizedException } from '@nestjs/common';
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
  };

  const mockAuthRepository = {
    recordLoginAttempt: jest.fn(),
    getRecentFailedAttempts: jest.fn(),
    revokeAllUserTokens: jest.fn(),
    createRefreshToken: jest.fn(),
  };

  const mockEmailService = {
    sendVerificationEmail: jest.fn(),
    verifyOtp: jest.fn(),
    sendWelcomeEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    verifyPasswordResetOtp: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mockAccessToken'),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, any> = {
        'bcrypt.rounds': 12,
        'jwt.refreshExpiresIn': '7d',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersRepository, useValue: mockUsersRepository },
        { provide: AuthRepository, useValue: mockAuthRepository },
        { provide: EmailService, useValue: mockEmailService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const registerDto = {
        email: 'new@example.com',
        password: 'Test@123456',
      };

      mockUsersRepository.findByEmail.mockResolvedValue(null);
      mockUsersRepository.create.mockResolvedValue({ id: 'new-id', ...registerDto });
      mockEmailService.sendVerificationEmail.mockResolvedValue('123456');

      const result = await service.register(registerDto);

      expect(result.message).toContain('Registration successful');
      expect(mockUsersRepository.create).toHaveBeenCalled();
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalled();
    });

    it('should throw ConflictException if user already exists', async () => {
      const registerDto = {
        email: 'existing@example.com',
        password: 'Test@123456',
      };

      mockUsersRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('verifyEmail', () => {
    it('should successfully verify email', async () => {
      const verifyDto = {
        email: 'test@example.com',
        otp: '123456',
      };

      mockUsersRepository.findByEmail.mockResolvedValue({ ...mockUser, isVerified: false });
      mockEmailService.verifyOtp.mockResolvedValue(true);
      mockUsersRepository.verifyUser.mockResolvedValue(undefined);

      const result = await service.verifyEmail(verifyDto);

      expect(result.message).toContain('Email verified successfully');
      expect(mockUsersRepository.verifyUser).toHaveBeenCalled();
    });

    it('should throw BadRequestException if user not found', async () => {
      const verifyDto = {
        email: 'nonexistent@example.com',
        otp: '123456',
      };

      mockUsersRepository.findByEmail.mockResolvedValue(null);

      await expect(service.verifyEmail(verifyDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if OTP invalid', async () => {
      const verifyDto = {
        email: 'test@example.com',
        otp: 'wrong-otp',
      };

      mockUsersRepository.findByEmail.mockResolvedValue({ ...mockUser, isVerified: false });
      mockEmailService.verifyOtp.mockResolvedValue(false);

      await expect(service.verifyEmail(verifyDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    it('should successfully login a user', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'Test@123456',
      };

      const verifiedUser = { ...mockUser, isVerified: true };
      
      mockAuthRepository.getRecentFailedAttempts.mockResolvedValue(0);
      mockUsersRepository.findByEmail.mockResolvedValue(verifiedUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      mockAuthRepository.revokeAllUserTokens.mockResolvedValue(undefined);
      mockAuthRepository.createRefreshToken.mockResolvedValue({});
      mockUsersRepository.updateLastLogin.mockResolvedValue(undefined);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).toBeDefined();
    });

    it('should throw UnauthorizedException after too many failed attempts', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrong-password',
      };

      mockAuthRepository.getRecentFailedAttempts.mockResolvedValue(5);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user not verified', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'Test@123456',
      };

      mockAuthRepository.getRecentFailedAttempts.mockResolvedValue(0);
      mockUsersRepository.findByEmail.mockResolvedValue({ ...mockUser, isVerified: false });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });
});