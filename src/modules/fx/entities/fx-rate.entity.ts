import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('fx_rates')
@Index(['baseCurrency', 'targetCurrency', 'timestamp'])
export class FxRate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 3 })
  baseCurrency!: string;

  @Column({ length: 3 })
  targetCurrency!: string;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  rate!: string;

  @Column()
  timestamp!: Date;

  @CreateDateColumn()
  createdAt!: Date;
}