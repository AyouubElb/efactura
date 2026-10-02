import { plainToInstance } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export enum InvoiceReaderMode {
  OpenAi = 'openai',
  Replay = 'replay',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3001;

  // The API's limited key, efactura_app — never the owner
  @Matches(/^postgres(ql)?:\/\/.+/, {
    message: 'DATABASE_URL must be a PostgreSQL connection URL',
  })
  DATABASE_URL: string;

  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET: string;

  // Shared only with the Next.js server
  @IsString()
  @MinLength(32)
  INTERNAL_API_KEY: string;

  // Signs the invitation and reset links; apart from the login secret
  @IsString()
  @MinLength(32)
  LINK_SECRET: string;

  @Matches(/^rediss?:\/\/.+/, {
    message: 'REDIS_URL must be a redis:// or rediss:// URL',
  })
  REDIS_URL: string;

  // Mailpit on the PC; Resend in production, its API key as the password
  @Matches(/^smtps?:\/\/.+/, {
    message: 'SMTP_URL must be an smtp:// or smtps:// URL',
  })
  SMTP_URL: string;

  @IsString()
  @MinLength(3)
  EMAIL_FROM: string;

  // The web app: email links point there
  @IsUrl({ require_tld: false, require_protocol: true })
  APP_URL: string;

  // Resend's test sender only delivers to the account owner
  @IsOptional()
  @IsEmail()
  EMAIL_REDIRECT_TO?: string;

  // File storage: S3Proxy on the PC, Cloudflare R2 in production
  @IsUrl({ require_tld: false, require_protocol: true })
  S3_ENDPOINT: string;

  @Matches(/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/, {
    message: 'S3_BUCKET must be a bucket name: lowercase letters, digits, dots, dashes',
  })
  S3_BUCKET: string;

  @IsString()
  @IsNotEmpty()
  S3_ACCESS_KEY_ID: string;

  @IsString()
  @IsNotEmpty()
  S3_SECRET_ACCESS_KEY: string;

  @IsString()
  @MinLength(20)
  OPENAI_API_KEY: string;

  // Chosen by the AI test: pnpm --filter api ai-test
  @Matches(/^[a-z0-9][a-z0-9.-]*$/, {
    message: 'OPENAI_MODEL must be a model id like gpt-6-luna',
  })
  OPENAI_MODEL: string = 'gpt-6-luna';

  // On the PC, replay answers with the AI's saved answers: free and always the same
  @IsEnum(InvoiceReaderMode)
  INVOICE_READER: InvoiceReaderMode = InvoiceReaderMode.OpenAi;
}

// Runs once at startup: a missing or wrong setting stops the API with a clear message
export function validate(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const env = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(env);

  if (errors.length > 0) {
    const details = errors.map(
      (error) =>
        `${error.property}: ${Object.values(error.constraints ?? {}).join(', ')}`,
    );
    throw new Error(`Invalid settings in .env:\n- ${details.join('\n- ')}`);
  }
  return env;
}
