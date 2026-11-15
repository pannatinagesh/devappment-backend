import process from 'node:process';
import { ZodError, z } from 'zod';
import 'dotenv/config';

const configSchema = z.object({
  ENV: z.string().default('local'),
  PORT: z
    .string()
    .regex(/^\d{4,5}$/)
    .optional()
    .default('3000'),
  APP_URL: z.string().url().default('http://localhost:5173'),
  API_BASE_URL: z.string().url().default('/api'),
  DB_URL: z
    .string()
    .url()
    .refine(
      url => url.startsWith('postgres://') || url.startsWith('postgresql://'),
      'DB_URL must be a valid postgresql url',
    ),
  ACCESS_TOKEN_SECRET: z.string(),
  REFRESH_TOKEN_SECRET: z.string(),
  ACCESS_TOKEN_EXPIRY: z.string(),
  REFRESH_TOKEN_EXPIRY: z.string(),
  WEB_PAGE_ACCESS_TOKEN_SECRET: z.string().default('devappment@2026'),
  COOKIE_ACCESS_TOKEN_EXPIRY: z.preprocess(val => Number.parseInt(val as string, 10), z.number().positive()),
  COOKIE_REFRESH_TOKEN_EXPIRY: z.preprocess(val => Number.parseInt(val as string, 10), z.number().positive()),
  GOOGLE_API_KEY: z.string()
});

try {
  configSchema.parse(process.env);
}
catch (error) {
  if (error instanceof ZodError)
    console.error(error.issues);

  process.exit(1);
}

export type Env = z.infer<typeof configSchema>;
