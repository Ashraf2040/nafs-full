// prisma.config.ts
// prisma.config.ts
import { defineConfig } from '@prisma/config';
import { config } from 'dotenv';

// Load the .env file so the config can read DATABASE_URL
config();

export default defineConfig({

  migrations: {
    // This tells Prisma to use tsx to execute your TypeScript seed file
    seed: 'npx tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});