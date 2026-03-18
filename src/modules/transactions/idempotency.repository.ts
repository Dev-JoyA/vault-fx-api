import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan } from 'typeorm';
import { IdempotencyRecord } from './entities/idempotency.entity';

@Injectable()
export class IdempotencyRepository {
  constructor(
    @InjectRepository(IdempotencyRecord)
    private readonly repository: Repository<IdempotencyRecord>,
  ) {}

  async findValidKey(
    key: string,
    userId: string,
  ): Promise<IdempotencyRecord | null> {
    return await this.repository.findOne({
      where: {
        key,
        userId,
        expiresAt: MoreThan(new Date()),
      },
    });
  }

  async createRecord(
    key: string,
    userId: string,
    endpoint: string,
    requestBody: Record<string, any>,
    ttlMinutes: number = 24 * 60,
  ): Promise<IdempotencyRecord> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + ttlMinutes);

    const record = this.repository.create({
      key,
      userId,
      endpoint,
      requestBody,
      expiresAt,
    });
    return await this.repository.save(record);
  }

  async updateResponse(
    key: string,
    responseBody: Record<string, any>,
    responseCode: number,
  ): Promise<void> {
    await this.repository.update({ key }, { responseBody, responseCode });
  }

  async cleanupExpired(): Promise<void> {
    await this.repository.delete({
      expiresAt: LessThan(new Date()),
    });
  }
}
