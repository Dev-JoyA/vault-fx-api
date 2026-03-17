import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as otpGenerator from 'otp-generator';
import { EmailRepository } from './email.repository';
import { getVerificationEmailTemplate } from './templates/verification-email.template';
import { getPasswordResetTemplate } from './templates/password-reset.template';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private readonly isDevelopment: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly emailRepository: EmailRepository,
  ) {
    this.isDevelopment = configService.get('nodeEnv') === 'development';
    this.transporter = this.initializeTransporter();
  }

  private initializeTransporter(): nodemailer.Transporter {
    if (this.isDevelopment) {
      this.logger.log('Running in development mode - emails will be logged to console');
      
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: 'ethereal.user@ethereal.email',
          pass: 'ethereal.password',
        },
      });
    } else {
      return nodemailer.createTransport({
        host: this.configService.get<string>('email.host'),
        port: this.configService.get<number>('email.port'),
        secure: false,
        auth: {
          user: this.configService.get<string>('email.user'),
          pass: this.configService.get<string>('email.pass'),
        },
        tls: {
          rejectUnauthorized: true,
        },
      });
    }
  }

  async sendVerificationEmail(userId: string, email: string): Promise<string> {
    try {
      const otp = this.generateOtp();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + (this.configService.get<number>('otp.expiryMinutes') || 10));

      await this.emailRepository.create(userId, otp, expiresAt);

      const mailOptions = {
        from: this.configService.get<string>('email.from'),
        to: email,
        subject: '🔐 Verify Your Email - Vault FX',
        html: getVerificationEmailTemplate(otp, email.split('@')[0]),
      };

      if (this.isDevelopment) {
        this.logger.log(`[DEV MODE] Email verification OTP for ${email}: ${otp}`);
        this.logger.log(`[DEV MODE] Email content would be sent to: ${email}`);
      } else {
        const info = await this.transporter.sendMail(mailOptions);
        this.logger.log(`Verification email sent to ${email}: ${info.messageId}`);
      }

      return otp;
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}: ${(error as Error).message}`, (error as Error).stack);
      throw new InternalServerErrorException('Failed to send verification email. Please try again.');
    }
  }


  async sendPasswordResetEmail(userId: string, email: string): Promise<string> {
    try {
      const otp = this.generateOtp();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + (this.configService.get<number>('otp.expiryMinutes') || 10));

      await this.emailRepository.createPasswordReset(userId, otp, expiresAt);

      const mailOptions = {
        from: this.configService.get<string>('email.from'),
        to: email,
        subject: '🔐 Reset Your Password - Vault FX',
        html: getPasswordResetTemplate(otp, email.split('@')[0]),
      };

      if (this.isDevelopment) {
        this.logger.log(`[DEV MODE] Password reset OTP for ${email}: ${otp}`);
        this.logger.log(`[DEV MODE] Email content would be sent to: ${email}`);
        
        setTimeout(async () => {
          await this.sendPasswordResetReminder(email, otp);
        }, 2 * 60 * 1000);
      } else {
        const info = await this.transporter.sendMail(mailOptions);
        this.logger.log(`Password reset email sent to ${email}: ${info.messageId}`);
      }

      return otp;
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}: ${(error as Error).message}`, (error as Error).stack);
      throw new InternalServerErrorException('Failed to send password reset email. Please try again.');
    }
  }

  private async sendPasswordResetReminder(email: string, otp: string): Promise<void> {
    try {
      const reminderMailOptions = {
        from: this.configService.get<string>('email.from'),
        to: email,
        subject: '⏰ Reminder: Reset Your Password - Vault FX',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #DC3545;">Quick Reminder!</h2>
            <p>You requested a password reset 2 minutes ago.</p>
            <p>Your OTP <strong>${otp}</strong> is still valid for another ${(this.configService.get<number>('otp.expiryMinutes') || 10) - 2} minutes.</p>
            <p>If you're having trouble, request a new OTP.</p>
          </div>
        `,
      };

      if (this.isDevelopment) {
        this.logger.log(`[DEV MODE] Password reset reminder for ${email}`);
      } else {
        await this.transporter.sendMail(reminderMailOptions);
      }
    } catch (error) {
      this.logger.error(`Failed to send password reset reminder to ${email}: ${(error as Error).message}`);
    }
  }

  async verifyOtp(userId: string, otp: string): Promise<boolean> {
    try {
      const validOtp = await this.emailRepository.findValidOTP(userId, otp);
      
      if (!validOtp) {
        return false;
      }

      await this.emailRepository.markAsUsed(validOtp.id);
      return true;
    } catch (error) {
      this.logger.error(`Failed to verify OTP for user ${userId}: ${(error as Error).message}`, (error as Error).stack);
      return false;
    }
  }

  async verifyPasswordResetOtp(userId: string, otp: string): Promise<boolean> {
    try {
      const validOtp = await this.emailRepository.findValidPasswordReset(userId, otp);
      
      if (!validOtp) {
        return false;
      }

      await this.emailRepository.markPasswordResetAsUsed(validOtp.id);
      return true;
    } catch (error) {
      this.logger.error(`Failed to verify password reset OTP for user ${userId}: ${(error as Error).message}`, (error as Error).stack);
      return false;
    }
  }

  async sendWelcomeEmail(email: string, name?: string): Promise<void> {
    try {
      const mailOptions = {
        from: this.configService.get<string>('email.from'),
        to: email,
        subject: '🎉 Welcome to Vault FX - Start Trading Today!',
        html: this.getWelcomeTemplate(name || email.split('@')[0]),
      };

      if (this.isDevelopment) {
        this.logger.log(`[DEV MODE] Welcome email would be sent to: ${email}`);
      } else {
        await this.transporter.sendMail(mailOptions);
      }
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}: ${(error as Error).message}`, (error as Error).stack);
    }
  }

  async sendTransactionAlert(email: string, transactionDetails: any): Promise<void> {
    try {
      const mailOptions = {
        from: this.configService.get<string>('email.from'),
        to: email,
        subject: `💰 Transaction Alert: ${transactionDetails.type} - Vault FX`,
        html: this.getTransactionAlertTemplate(transactionDetails),
      };

      if (this.isDevelopment) {
        this.logger.log(`[DEV MODE] Transaction alert would be sent to: ${email}`);
        this.logger.log(`Transaction details: ${JSON.stringify(transactionDetails)}`);
      } else {
        await this.transporter.sendMail(mailOptions);
      }
    } catch (error) {
      this.logger.error(`Failed to send transaction alert to ${email}: ${(error as Error).message}`, (error as Error).stack);
    }
  }

  async sendSecurityAlert(email: string, alertType: string, details: any): Promise<void> {
    try {
      const subject = this.getSecurityAlertSubject(alertType);
      const template = this.getSecurityAlertTemplate(alertType, details);

      const mailOptions = {
        from: this.configService.get<string>('email.from'),
        to: email,
        subject: `🔒 Security Alert: ${subject} - Vault FX`,
        html: template,
      };

      if (this.isDevelopment) {
        this.logger.log(`[DEV MODE] Security alert would be sent to: ${email}`);
        this.logger.log(`Alert details: ${JSON.stringify({ alertType, details })}`);
      } else {
        await this.transporter.sendMail(mailOptions);
      }
    } catch (error) {
      this.logger.error(`Failed to send security alert to ${email}: ${(error as Error).message}`, (error as Error).stack);
    }
  }

  private generateOtp(): string {
    return otpGenerator.generate(this.configService.get<number>('otp.length') || 6, {
      digits: true,
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    });
  }

  private getWelcomeTemplate(name: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #0B4F6C;">Welcome to Vault FX, ${name}! 🎉</h1>
        <p>Your account has been successfully verified. You can now start trading currencies securely.</p>
        <div style="background-color: #f0f7fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="color: #0B4F6C;">Quick Start Guide:</h3>
          <ul style="list-style-type: none; padding: 0;">
            <li style="margin: 10px 0;">✅ Fund your NGN wallet</li>
            <li style="margin: 10px 0;">✅ Check real-time exchange rates</li>
            <li style="margin: 10px 0;">✅ Start trading currencies</li>
            <li style="margin: 10px 0;">✅ Track your portfolio</li>
          </ul>
        </div>
        <a href="#" style="background-color: #0B4F6C; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Start Trading Now</a>
      </div>
    `;
  }

  private getTransactionAlertTemplate(transaction: any): string {
    const isCredit = transaction.type === 'FUND' || transaction.type === 'TRADE_BUY';
    const color = isCredit ? '#28a745' : '#DC3545';
    const sign = isCredit ? '+' : '-';

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${color};">Transaction ${transaction.status}</h2>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px;">
          <p><strong>Type:</strong> ${transaction.type}</p>
          <p><strong>Amount:</strong> ${sign}${transaction.amount} ${transaction.currency}</p>
          <p><strong>Reference:</strong> ${transaction.reference}</p>
          <p><strong>Date:</strong> ${new Date(transaction.date).toLocaleString()}</p>
          <p><strong>Status:</strong> ${transaction.status}</p>
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">If you didn't perform this transaction, please contact support immediately.</p>
      </div>
    `;
  }

  private getSecurityAlertSubject(alertType: string): string {
    const subjects: Record<string, string> = {
      NEW_LOGIN: 'New Login Detected',
      PASSWORD_CHANGED: 'Password Changed',
      PROFILE_UPDATED: 'Profile Updated',
      DEVICE_ADDED: 'New Device Added',
      SUSPICIOUS_ACTIVITY: 'Suspicious Activity Detected',
    };
    return subjects[alertType] || 'Security Update';
  }

  private getSecurityAlertTemplate(alertType: string, details: any): string {
    const templates: Record<string, string> = {
      NEW_LOGIN: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0B4F6C;">New Login to Your Account</h2>
          <p>We detected a new login to your Vault FX account:</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px;">
            <p><strong>Location:</strong> ${details.location || 'Unknown'}</p>
            <p><strong>Device:</strong> ${details.device || 'Unknown'}</p>
            <p><strong>Time:</strong> ${new Date(details.time).toLocaleString()}</p>
          </div>
          <p>If this was you, you can ignore this alert. If not, please secure your account immediately.</p>
        </div>
      `,
      SUSPICIOUS_ACTIVITY: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #DC3545;">⚠️ Suspicious Activity Detected</h2>
          <p>We've detected unusual activity on your account:</p>
          <div style="background-color: #fff3cd; padding: 20px; border-radius: 10px;">
            <p><strong>Activity:</strong> ${details.activity}</p>
            <p><strong>Time:</strong> ${new Date(details.time).toLocaleString()}</p>
          </div>
          <p>For your security, we've temporarily limited some features. Please contact support immediately.</p>
        </div>
      `,
    };
    return templates[alertType] || '<p>Security alert for your Vault FX account.</p>';
  }

  async cleanupExpiredOtps(): Promise<void> {
    try {
      await this.emailRepository.deleteExpired();
      this.logger.log('Cleaned up expired OTPs');
    } catch (error) {
      this.logger.error(`Failed to cleanup expired OTPs: ${(error as Error).message}`, (error as Error).stack);
    }
  }

  async resendVerificationOtp(userId: string, email: string): Promise<void> {
  try {
    await this.emailRepository.invalidateUserOtps(userId);
    
    const otp = this.generateOtp();
    const expiresAt = new Date();
    expiresAt.setMinutes(
      expiresAt.getMinutes() + 
      (this.configService.get<number>('otp.expiryMinutes') || 10)
    );

    await this.emailRepository.create(userId, otp, expiresAt);

    const mailOptions = {
      from: this.configService.get<string>('email.from'),
      to: email,
      subject: '🔄 New Verification Code - Vault FX',
      html: getVerificationEmailTemplate(otp, email.split('@')[0]),
    };

    if (this.isDevelopment) {
      this.logger.log(`[DEV MODE] Resent verification OTP for ${email}: ${otp}`);
    } else {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Resent verification email to ${email}: ${info.messageId}`);
    }
  } catch (error) {
    this.logger.error(`Failed to resend verification email to ${email}: ${(error as Error).message}`);
    throw new InternalServerErrorException('Failed to resend verification email. Please try again.');
  }
}

async invalidateUserOtps(userId: string): Promise<void> {
  await this.emailRepository.invalidateUserOtps(userId);
}
}