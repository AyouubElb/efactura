import { ConsoleLogger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { ApiExceptionFilter } from './common/filters/api-exception.filter.js';
import { validationException } from './common/filters/validation-exception.factory.js';
import { ResponseInterceptor } from './common/response/response.interceptor.js';
import {
  Environment,
  type EnvironmentVariables,
} from './config/env.validation.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // JSON logs in production, readable logs on the PC
    logger: new ConsoleLogger({
      json: process.env.NODE_ENV === Environment.Production,
    }),
  });
  const config =
    app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: validationException,
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));
  app.useGlobalFilters(new ApiExceptionFilter());

  // Lets the API finish its work before it stops
  app.enableShutdownHooks();

  if (config.get('NODE_ENV', { infer: true }) === Environment.Development) {
    const document = new DocumentBuilder()
      .setTitle('eFactura API')
      .setDescription('Called only by the Next.js server')
      .setVersion('1.0')
      .addApiKey(
        { type: 'apiKey', in: 'header', name: 'X-Internal-Key' },
        'internal-key',
      )
      .addBearerAuth()
      .build();
    SwaggerModule.setup(
      'docs',
      app,
      () => SwaggerModule.createDocument(app, document),
      {
        swaggerOptions: { persistAuthorization: true },
      },
    );
  }

  await app.listen(config.get('PORT', { infer: true }));
}
await bootstrap();
