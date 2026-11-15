import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import process from 'node:process';
import '../config/env.js';

dotenv.config()

const dbPoolMax = Number.parseInt(process.env.DB_POOL_MAX ?? '10', 10);

const client = postgres(process.env.DB_URL as string, {
  max: Number.isFinite(dbPoolMax) && dbPoolMax > 0 ? dbPoolMax : 10,
  idle_timeout: 30,
  connect_timeout: 10,
  prepare: false,
  connection: {
    application_name: process.env.DB_APP_NAME ?? 'onecomp-backend',
  },
});

export const db = drizzle({
  client,
});

