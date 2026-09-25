import { ConsoleLogger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { Environment, type EnvironmentVariables } from './config/env.validation.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // JSON logs in production, readable logs on the PC
    logger: new ConsoleLogger({ json: process.env.NODE_ENV === Environment.Production }),
  });
  const config = app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Lets the API finish its work before it stops
  app.enableShutdownHooks();

  if (config.get('NODE_ENV', { infer: true }) === Environment.Development) {
    const document = new DocumentBuilder()
      .setTitle('eFactura API')
      .setDescription('Called only by the Next.js server')
      .setVersion('1.0')
      .build();
    SwaggerModule.setup('docs', app, () => SwaggerModule.createDocument(app, document));
  }

  await app.listen(config.get('PORT', { infer: true }));
}
await bootstrap();
