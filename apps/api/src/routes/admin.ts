import { Hono } from 'hono';
import type { AppEnv } from '../context';
import { requirePlatformAdmin } from '../middleware/guard';

export const admin = new Hono<AppEnv>();

// Kaben only. Everything under /api/admin requires platform_admin.
admin.use('*', requirePlatformAdmin());

// Filled in Batch 3c.
admin.get('/firms', (c) => c.json({ error: 'not_implemented', milestone: '3c' }, 501));
admin.post('/firms', (c) => c.json({ error: 'not_implemented', milestone: '3c' }, 501));