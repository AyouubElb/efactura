import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsString,
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
