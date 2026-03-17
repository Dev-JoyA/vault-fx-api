import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';

export enum TransactionType {
  FUND = 'fund',
  TRANSFER = 'transfer',
  CONVERT = 'convert',
  TRADE = 'trade',
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REVERSED = 'reversed',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'wallet_id', type: 'uuid', nullable: true })
  walletId!: string | null;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type!: TransactionType;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status!: TransactionStatus;

  @Column({ type: 'varchar', length: 3, nullable: true })
  sourceCurrency!: string | null;

  @Column({ type: 'varchar', length: 3, nullable: true })
  targetCurrency!: string | null;

  @Column({ type: 'decimal', precision: 20, scale: 8, nullable: true })
  sourceAmount!: string | null;

  @Column({ type: 'decimal', precision: 20, scale: 8, nullable: true })
  targetAmount!: string | null;

  @Column({ type: 'decimal', precision: 20, scale: 8, nullable: true })
  fxRate!: string | null;

  @Column({ type: 'varchar', unique: true })
  reference!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: object | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt!: Date | null;

  @ManyToOne(() => User, (user) => user.transactions)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Wallet, (wallet) => wallet.transactions)
  @JoinColumn({ name: 'wallet_id' })
  wallet!: Wallet | null;
}