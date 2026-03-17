import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordReset } from './entities/password-reset.entity';
import { LoginAttempt } from './entities/login-attempt.entity';

@Injectable()
export class AuthRepository {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(PasswordReset)
    private readonly passwordResetRepository: Repository<PasswordReset>,
    @InjectRepository(LoginAttempt)
    private readonly loginAttemptRepository: Repository<LoginAttempt>,
  ) {}

  async createRefreshToken(
    userId: string,
    token: string,
    expiresAt: Date,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<RefreshToken> {
    const refreshToken = this.refreshTokenRepository.create({
      userId,
      token,
      expiresAt,
      userAgent,
      ipAddress,
    });
    return await this.refreshTokenRepository.save(refreshToken);
  }

  async findValidRefreshToken(token: string): Promise<RefreshToken | null> {
    return await this.refreshTokenRepository.findOne({
      where: {
        token,
        isRevoked: false,
        expiresAt: MoreThan(new Date()),
      },
      relations: ['user'],
    });
  }

  async revokeRefreshToken(id: string, replacedByToken?: string): Promise<void> {
    await this.refreshTokenRepository.update(id, {
      isRevoked: true,
      replacedByToken: replacedByToken || null,
    });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true },
    );
  }

  async deleteExpiredRefreshTokens(): Promise<void> {
    await this.refreshTokenRepository.delete({
      expiresAt: LessThan(new Date()),
    });
  }

  async createPasswordReset(userId: string, otpCode: string, expiresAt: Date): Promise<PasswordReset> {
    const passwordReset = this.passwordResetRepository.create({
      userId,
      otpCode,
      expiresAt,
    });
    return await this.passwordResetRepository.save(passwordReset);
  }

  async findValidPasswordReset(userId: string, otpCode: string): Promise<PasswordReset | null> {
    return await this.passwordResetRepository.findOne({
      where: {
        userId,
        otpCode,
        isUsed: false,
        expiresAt: MoreThan(new Date()),
      },
    });
  }

  async markPasswordResetAsUsed(id: string): Promise<void> {
    await this.passwordResetRepository.update(id, { isUsed: true });
  }

  async incrementPasswordResetAttempts(id: string): Promise<void> {
    await this.passwordResetRepository.increment({ id }, 'attempts', 1);
  }

  async deleteExpiredPasswordResets(): Promise<void> {
    await this.passwordResetRepository.delete({
      expiresAt: LessThan(new Date()),
    });
  }

  async recordLoginAttempt(
    email: string,
    isSuccessful: boolean,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    failureReason?: string,
  ): Promise<LoginAttempt> {
    const attempt = this.loginAttemptRepository.create({
      email,
      userId: userId || null,
      isSuccessful,
      ipAddress,
      userAgent,
      failureReason,
    });
    return await this.loginAttemptRepository.save(attempt);
  }

  async getRecentFailedAttempts(email: string, minutes: number = 15): Promise<number> {
    const since = new Date();
    since.setMinutes(since.getMinutes() - minutes);

    return await this.loginAttemptRepository.count({
      where: {
        email,
        isSuccessful: false,
        createdAt: MoreThan(since),
      },
    });
  }

  async getUserLoginHistory(userId: string, limit: number = 10): Promise<LoginAttempt[]> {
    return await this.loginAttemptRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async cleanupOldLoginAttempts(days: number = 30): Promise<void> {
    const before = new Date();
    before.setDate(before.getDate() - days);
    await this.loginAttemptRepository.delete({
      createdAt: LessThan(before),
    });
  }
}