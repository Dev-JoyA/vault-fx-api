import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get('database.host'),
  port: configService.get('database.port'),
  username: configService.get('database.username'),
  password: configService.get('database.password'),
  database: configService.get('database.database'),
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: configService.get('nodeEnv') === 'development',
  logging: configService.get('nodeEnv') === 'development',
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  migrationsRun: true,
  ssl:
    configService.get('database.ssl') === 'true'
      ? { rejectUnauthorized: false }
      : false,

  extra: {
    max: 10,
    connectionTimeoutMillis: 2000,
  },
});
