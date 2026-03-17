import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';
import { EmailVerification } from '../../email/entities/email-verification.entity';
import { RefreshToken } from '../../auth/entities/refresh-token.entity';
import { LoginAttempt } from '../../auth/entities/login-attempt.entity';
import { PasswordReset } from '../../auth/entities/password-reset.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  @Exclude()
  passwordHash!: string;

  @Column({ default: false })
  isVerified!: boolean;

  @Column({ default: 'user' })
  role!: string;

  @Column({ type: 'timestamptz', nullable: true, default: null })
    lastLoginAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => Wallet, (wallet) => wallet.user)
  wallets!: Wallet[];

  @OneToMany(() => Transaction, (transaction) => transaction.user)
  transactions!: Transaction[];

  @OneToMany(() => EmailVerification, (verification) => verification.user)
  emailVerifications!: EmailVerification[];

  @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.user)
  refreshTokens!: RefreshToken[];

  @OneToMany(() => PasswordReset, (passwordReset) => passwordReset.user)
  passwordResets!: PasswordReset[];

  @OneToMany(() => LoginAttempt, (loginAttempt) => loginAttempt.user)
    loginAttempts!: LoginAttempt[];
}