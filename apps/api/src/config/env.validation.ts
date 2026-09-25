import { plainToInstance } from 'class-transformer';
import { IsEnum, IsInt, Max, Min, validateSync } from 'class-validator';

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
}

// Runs once at startup: a missing or wrong setting stops the API with a clear message
export function validate(config: Record<string, unknown>): EnvironmentVariables {
  const env = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(env);

  if (errors.length > 0) {
    const details = errors.map(
      (error) => `${error.property}: ${Object.values(error.constraints ?? {}).join(', ')}`,
    );
    throw new Error(`Invalid settings in .env:\n- ${details.join('\n- ')}`);
  }
  return env;
}
