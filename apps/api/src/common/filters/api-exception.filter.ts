import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../../generated/prisma/client.js';

export interface ApiError {
  statusCode: number;
  code: string;
  message: string;
  fields?: Record<string, string>;
}

const DEFAULTS: Record<number, Omit<ApiError, 'statusCode'>> = {
  400: { code: 'BAD_REQUEST', message: 'Requête invalide' },
  401: { code: 'UNAUTHORIZED', message: 'Session expirée, reconnectez-vous' },
  403: { code: 'FORBIDDEN', message: 'Action non autorisée' },
  404: { code: 'NOT_FOUND', message: 'Élément introuvable' },
  409: { code: 'CONFLICT', message: 'Action impossible' },
  429: {
    code: 'TOO_MANY_REQUESTS',
    message: 'Trop de tentatives, réessayez dans 15 minutes',
  },
  500: {
    code: 'INTERNAL_ERROR',
    message: 'Erreur interne, réessayez plus tard',
  },
  503: { code: 'SERVICE_UNAVAILABLE', message: 'Service indisponible' },
};

// Every error becomes { success: false, error }
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const error = toApiError(exception);
    // Our own coded 5xx, like EMAIL_NOT_QUEUED, are logged where they happen
    if (error.statusCode >= 500 && !hasOwnCode(exception)) {
      this.logger.error(
        exception instanceof Error ? exception.stack : exception,
      );
    }
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(error.statusCode)
      .json({ success: false, error });
  }
}

// Our errors carry a code: new ConflictException({ code, message })
function hasOwnCode(exception: unknown): exception is HttpException {
  if (!(exception instanceof HttpException)) {
    return false;
  }
  const body = exception.getResponse();
  return typeof body === 'object' && 'code' in body;
}

function toApiError(exception: unknown): ApiError {
  if (hasOwnCode(exception)) {
    return {
      statusCode: exception.getStatus(),
      ...(exception.getResponse() as Omit<ApiError, 'statusCode'>),
    };
  }
  if (exception instanceof HttpException) {
    return withDefaults(exception.getStatus());
  }
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    return fromPrisma(exception);
  }
  return withDefaults(500);
}

function fromPrisma(error: Prisma.PrismaClientKnownRequestError): ApiError {
  // PostgreSQL's own code: 23514 is a CHECK or one of our freeze triggers
  const cause = error.meta?.driverAdapterError as
    { cause?: { originalCode?: string } } | undefined;
  const pgCode = cause?.cause?.originalCode;

  if (error.code === 'P2025') {
    return withDefaults(404);
  }
  if (error.code === 'P2002') {
    return {
      statusCode: 409,
      code: 'ALREADY_EXISTS',
      message: 'Cet élément existe déjà',
    };
  }
  if (error.code === 'P2003' || pgCode === '23503') {
    return {
      statusCode: 409,
      code: 'IN_USE',
      message: 'Cet élément est utilisé ailleurs',
    };
  }
  // 22021: a character PostgreSQL can't store, like \u0000
  if (pgCode === '22021') {
    return {
      statusCode: 400,
      code: 'INVALID_TEXT',
      message: 'Texte invalide : caractère non autorisé',
    };
  }
  if (pgCode === '23514') {
    return {
      statusCode: 409,
      code: 'RULE_VIOLATION',
      message: 'Action refusée par une règle de gestion',
    };
  }
  return withDefaults(500);
}

function withDefaults(statusCode: number): ApiError {
  return {
    statusCode,
    ...(DEFAULTS[statusCode] ?? {
      code: `HTTP_${statusCode}`,
      message: 'Requête refusée',
    }),
  };
}
