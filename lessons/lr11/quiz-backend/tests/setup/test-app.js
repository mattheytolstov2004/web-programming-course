import { Hono } from 'hono';
import authRoute from '../../src/routes/auth.js';
import sessionsRoute from '../../src/routes/sessions.js';
import adminRoute from '../../src/routes/admin.js';
export const app = new Hono();
app.route('/api/auth', authRoute);
app.route('/api/sessions', sessionsRoute);
app.route('/api/admin', adminRoute);
app.get('/health', (c) => {
    return c.json({ status: 'ok' });
});
