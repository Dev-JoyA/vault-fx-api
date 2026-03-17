import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import helmet from 'helmet';
import * as compression from 'compression';
import { seedAdmin } from './database/seeders/admin.seeder';

async function bootstrap() {

  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const dataSource = app.get(DataSource);
  const isProduction = configService.get('nodeEnv') === 'production';
  const port = configService.get<number>('port') ?? 3000;
  const apiPrefix = configService.get<string>('apiPrefix') ?? 'api';


  await seedAdmin(dataSource, configService);

  app.use(helmet());

  const corsOrigins = configService.get<string>('cors.origin');
  const allowedOrigins = corsOrigins
    ? corsOrigins.split(',').map((o: string) => o.trim())
    : ['http://localhost:3000'];

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) return callback(null, true);
      if (origin === `http://localhost:${port}`) return callback(null, true);
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key'],
    credentials: true,
  });

  app.use(compression());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: isProduction,
    }),
  );

  app.setGlobalPrefix(apiPrefix, {
  exclude: [`${apiPrefix}/docs`, `${apiPrefix}/docs-json`],
});
  app.enableShutdownHooks();

  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('Vault FX API')
      .setDescription('Foreign Exchange Trading API')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('wallet', 'Wallet management')
      .addTag('fx', 'Foreign exchange rates')
      .addTag('trading', 'Currency trading')
      .addTag('transactions', 'Transaction history')
      .build();

    const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

    console.log(`Swagger available at: http://localhost:${port}/${apiPrefix}/docs`);
  }

  await app.listen(port, '0.0.0.0');

  console.log(`✅ Application running on: http://localhost:${port}/${apiPrefix}`);
}

bootstrap().catch((err) => {
  console.error('❌ Bootstrap failed:', err);
  process.exit(1);
});