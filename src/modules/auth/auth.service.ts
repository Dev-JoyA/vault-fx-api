import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { AuthRepository } from './auth.repository';
import { UsersRepository } from '../users/users.repository';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly usersRepository: UsersRepository,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto, userAgent?: string, ipAddress?: string): Promise<{ message: string }> {
    const { email, password } = registerDto;

    const existingUser = await this.usersRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const bcryptRounds = this.configService.get<number>('bcrypt.rounds') || 12;
    const passwordHash = await bcrypt.hash(password, bcryptRounds);

    const user = await this.usersRepository.create({
      email,
      passwordHash,
      isVerified: false,
    });

    await this.emailService.sendVerificationEmail(user.id, email);

    await this.authRepository.recordLoginAttempt(email, true, user.id, ipAddress, userAgent);

    return {
      message: 'Registration successful. Please check your email for verification OTP.',
    };
  }

  async verifyEmail(verifyOtpDto: VerifyOtpDto): Promise<{ message: string }> {
    const { email, otp } = verifyOtpDto;

    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isVerified) {
      throw new BadRequestException('Email already verified');
    }

    const isValid = await this.emailService.verifyOtp(user.id, otp);
    if (!isValid) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    await this.usersRepository.verifyUser(user.id);
    await this.emailService.sendWelcomeEmail(email, email.split('@')[0]);

    return { message: 'Email verified successfully. You can now log in.' };
  }

  async resendVerificationOtp(email: string): Promise<{ message: string }> {
  const user = await this.usersRepository.findByEmail(email);
  if (!user) {
    return { message: 'If your email is registered, a new OTP has been sent.' };
  }

  if (user.isVerified) {
    throw new BadRequestException('Email already verified');
  }

  await this.emailService.resendVerificationOtp(user.id, email);

  return { message: 'If your email is registered, a new OTP has been sent.' };
}


  async login(loginDto: LoginDto): Promise<{ accessToken: string; refreshToken: string; user: Partial<User> }> {
    const { email, password, userAgent, ipAddress } = loginDto;

    const recentFailedAttempts = await this.authRepository.getRecentFailedAttempts(email, 15);
    if (recentFailedAttempts >= 5) {
      throw new UnauthorizedException('Too many failed attempts. Please try again after 15 minutes.');
    }

    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      await this.authRepository.recordLoginAttempt(email, false, undefined, ipAddress, userAgent, 'User not found');
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isVerified) {
      await this.authRepository.recordLoginAttempt(email, false, user.id, ipAddress, userAgent, 'Email not verified');
      throw new UnauthorizedException('Please verify your email before logging in');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      await this.authRepository.recordLoginAttempt(email, false, user.id, ipAddress, userAgent, 'Invalid password');
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.authRepository.revokeAllUserTokens(user.id);

    const tokens = await this.generateTokens(user.id, email, userAgent, ipAddress);

    await this.usersRepository.updateLastLogin(user.id);
    await this.authRepository.recordLoginAttempt(email, true, user.id, ipAddress, userAgent);

    const { passwordHash, ...userWithoutPassword } = user;

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: userWithoutPassword,
    };
  }

  async refreshTokens(refreshTokenDto: RefreshTokenDto, userAgent?: string, ipAddress?: string): Promise<{ accessToken: string; refreshToken: string }> {
    const { refreshToken } = refreshTokenDto;

    const tokenEntity = await this.authRepository.findValidRefreshToken(refreshToken);
    if (!tokenEntity) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.authRepository.revokeRefreshToken(tokenEntity.id);

    const tokens = await this.generateTokens(
      tokenEntity.userId,
      tokenEntity.user.email,
      userAgent || tokenEntity.userAgent || undefined,
      ipAddress || tokenEntity.ipAddress || undefined,
    );

    return tokens;
  }

  async logout(userId: string, refreshToken?: string): Promise<{ message: string }> {
    if (refreshToken) {
      const tokenEntity = await this.authRepository.findValidRefreshToken(refreshToken);
      if (tokenEntity) {
        await this.authRepository.revokeRefreshToken(tokenEntity.id);
      }
    } else {
      await this.authRepository.revokeAllUserTokens(userId);
    }

    return { message: 'Logged out successfully' };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;

    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      return { message: 'If a user with that email exists, a password reset OTP has been sent.' };
    }

    await this.emailService.sendPasswordResetEmail(user.id, email);

    return { message: 'If a user with that email exists, a password reset OTP has been sent.' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    const { email, otp, newPassword } = resetPasswordDto;

    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const isValid = await this.emailService.verifyPasswordResetOtp(user.id, otp);
    if (!isValid) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const bcryptRounds = this.configService.get<number>('bcrypt.rounds') || 12;
    const passwordHash = await bcrypt.hash(newPassword, bcryptRounds);
    
    await this.usersRepository.update(user.id, { passwordHash });

    await this.authRepository.revokeAllUserTokens(user.id);

    return { message: 'Password reset successfully. You can now log in with your new password.' };
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersRepository.findByEmail(email);
    if (!user || !user.isVerified) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  private async generateTokens(
    userId: string,
    email: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: userId, email };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = uuidv4();
    const refreshTokenExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn') || '7d';
    const expiresAt = new Date();
    
    if (refreshTokenExpiresIn.endsWith('d')) {
      const days = parseInt(refreshTokenExpiresIn, 10);
      expiresAt.setDate(expiresAt.getDate() + days);
    } else if (refreshTokenExpiresIn.endsWith('h')) {
      const hours = parseInt(refreshTokenExpiresIn, 10);
      expiresAt.setHours(expiresAt.getHours() + hours);
    } else {
      expiresAt.setDate(expiresAt.getDate() + 7);
    }

    await this.authRepository.createRefreshToken(
      userId,
      refreshToken,
      expiresAt,
      userAgent,
      ipAddress,
    );

    return { accessToken, refreshToken };
  }
}