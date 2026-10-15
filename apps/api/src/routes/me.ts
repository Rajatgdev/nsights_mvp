import { Hono } from 'hono';
import type { AppEnv } from '../context';

export const me = new Hono<AppEnv>();
me.get('/', (c) => c.json({ user: c.get('user'), membership: c.get('membership') ?? null }));