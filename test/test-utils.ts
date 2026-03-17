import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { testDatabaseConfig } from '../src/config/test.config';


export class TestUtils {
  static async createTestingModule(modules: any[]): Promise<TestingModule> {
    return await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(testDatabaseConfig as TypeOrmModuleOptions),
        ...modules,
      ],
    }).compile();
  }

  static async createTestApp(moduleFixture: TestingModule): Promise<INestApplication> {
    const app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    await app.init();
    return app;
  }

  static generateTestEmail(): string {
    return `test_${Date.now()}@example.com`;
  }

  static generateTestPassword(): string {
    return 'Test@123456';
  }

  static generateTestOtp(): string {
    return '123456';
  }
}