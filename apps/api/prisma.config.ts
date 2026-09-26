import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// The CLI uses the owner key: migrations create tables, triggers and rights.
// process.env, not the env helper: `prisma generate` must work without a database.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.MIGRATION_DATABASE_URL,
  },
});
