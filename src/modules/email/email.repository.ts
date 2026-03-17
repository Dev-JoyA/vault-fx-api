import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { EmailVerification } from './entities/email-verification.entity';
import { PasswordReset } from '../auth/entities/password-reset.entity';

@Injectable()
export class EmailRepository {
  constructor(
    @InjectRepository(EmailVerification)
    private readonly emailRepository: Repository<EmailVerification>,
    @InjectRepository(PasswordReset)
    private readonly passwordResetRepository: Repository<PasswordReset>,
  ) {}

  async create(userId: string, otpCode: string, expiresAt: Date): Promise<EmailVerification> {
    const verification = this.emailRepository.create({
      userId,
      otpCode,
      expiresAt,
    });
    return await this.emailRepository.save(verification);
  }

  async createPasswordReset(userId: string, otpCode: string, expiresAt: Date): Promise<PasswordReset> {
    const passwordReset = this.passwordResetRepository.create({
      userId,
      otpCode,
      expiresAt,
    });
    return await this.passwordResetRepository.save(passwordReset);
  }

  async findValidOTP(userId: string, otpCode: string): Promise<EmailVerification | null> {
    return await this.emailRepository.findOne({
      where: {
        userId,
        otpCode,
        isUsed: false,
        expiresAt: MoreThan(new Date()),
      },
    });
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

  async markAsUsed(id: string): Promise<void> {
    await this.emailRepository.update(id, { isUsed: true });
  }

  async markPasswordResetAsUsed(id: string): Promise<void> {
    await this.passwordResetRepository.update(id, { isUsed: true });
  }

  async incrementAttempts(id: string): Promise<void> {
    await this.emailRepository.increment({ id }, 'attempts', 1);
  }

  async incrementPasswordResetAttempts(id: string): Promise<void> {
    await this.passwordResetRepository.increment({ id }, 'attempts', 1);
  }

  async deleteExpired(): Promise<void> {
    await this.emailRepository.delete({
      expiresAt: LessThan(new Date()),
    });
    await this.passwordResetRepository.delete({
      expiresAt: LessThan(new Date()),
    });
  }

  async countRecentAttempts(userId: string, minutes: number = 5): Promise<number> {
  const since = new Date();
  since.setMinutes(since.getMinutes() - minutes);
  
  return await this.emailRepository.count({
    where: {
      userId,
      createdAt: MoreThan(since),
    },
  });
}

async invalidateUserOtps(userId: string): Promise<void> {
  await this.emailRepository.update(
    { userId, isUsed: false },
    { isUsed: true }
  );
}
}