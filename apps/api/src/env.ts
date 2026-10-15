// MUST be imported first — loads root .env before @nsights/db reads DATABASE_URL.
import { config } from 'dotenv';
import { resolve } from 'node:path';
config({ path: resolve(process.cwd(), '../../.env') });
config({ path: resolve(process.cwd(), '.env') });