import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { join } from 'path';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors();

  // 支付宝异步通知使用 application/x-www-form-urlencoded
  app.use(express.urlencoded({ extended: true }));

  // Serve uploaded files in mock mode
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  await app.listen(3000);
  console.log('Server running on http://localhost:3000');
}
bootstrap();
