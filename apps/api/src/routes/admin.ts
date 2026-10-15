import { Hono } from 'hono';
// Kaben (platform_admin) only: GET template, POST CSV upload -> validate -> publish new data_version blob. Create firms + first firm_admin, set seat limit, view headcount/roles only (never firm content).
export const admin = new Hono();
admin.get('/', (c) => c.json({ milestone: 'admin — TODO' }, 501));
