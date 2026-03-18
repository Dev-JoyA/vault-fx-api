import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('idempotency_records')
@Index(['key', 'expiresAt'])
export class IdempotencyRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  key!: string;

  @Column()
  userId!: string;

  @Column()
  endpoint!: string;

  @Column({ type: 'jsonb', nullable: true })
  requestBody!: object | null;

  @Column({ type: 'jsonb', nullable: true })
  responseBody!: object | null;

  @Column({ type: 'integer', nullable: true })
  responseCode!: number;

  @Column()
  expiresAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;
}
