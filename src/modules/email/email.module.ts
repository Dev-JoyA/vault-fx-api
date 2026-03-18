import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailRepository } from './email.repository';
import { EmailVerification } from './entities/email-verification.entity';
import { PasswordReset } from '../auth/entities/password-reset.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailVerification, PasswordReset]),
    ConfigModule,
  ],
  providers: [EmailService, EmailRepository],
  exports: [EmailService, EmailRepository],
})
export class EmailModule {}
