import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app';

async function bootstrap() {
  for (const name of ['DATABASE_URL', 'ADMIN_USERNAME', 'ADMIN_PASSWORD', 'TOKEN_ENCRYPTION_KEY']) if (!process.env[name]) throw new Error(`${name} is required`);
  if (Buffer.from(process.env.TOKEN_ENCRYPTION_KEY!, 'base64').length !== 32) throw new Error('TOKEN_ENCRYPTION_KEY must be a base64 encoded 32-byte key');
  const app = await NestFactory.create(AppModule);
  app.use((_req: unknown, res: import('express').Response, next: import('express').NextFunction) => {
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });
  app.use(cookieParser());
  app.setGlobalPrefix('api', { exclude: ['health'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT || 3001), '0.0.0.0');
}
bootstrap();
