import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { newDb } from 'pg-mem';
import { createApp } from '../src/app.js';

describe('authentication api', () => {
  let app;
  let pool;
  const fetchCsrf = async (agent) => {
    const csrfResponse = await agent.get('/api/auth/csrf-token');
    return csrfResponse.body.data.csrfToken;
  };

  beforeAll(async () => {
    const db = newDb();
    const { Pool } = db.adapters.createPg();
    pool = new Pool();
    app = await createApp({ pool });
  });

  afterAll(async () => {
    await pool.end();
  });

  it('registers user and returns needsOrganization', async () => {
    const agent = request.agent(app);
    const csrf = await fetchCsrf(agent);
    const response = await agent.post('/api/auth/register').set('x-csrf-token', csrf).send({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      password: 'Strong!Pass123',
      rememberSession: true
    });

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.needsOrganization).toBe(true);
    expect(response.headers['set-cookie']).toBeDefined();
  });

  it('logs in and supports me endpoint', async () => {
    const agent = request.agent(app);
    const csrf = await fetchCsrf(agent);
    const login = await agent.post('/api/auth/login').set('x-csrf-token', csrf).send({
      email: 'jane@example.com',
      password: 'Strong!Pass123'
    });

    expect(login.statusCode).toBe(200);

    const me = await agent.get('/api/auth/me');
    expect(me.statusCode).toBe(200);
    expect(me.body.data.user.email).toBe('jane@example.com');
  });

  it('completes organization onboarding for first login', async () => {
    const agent = request.agent(app);
    const csrf = await fetchCsrf(agent);
    const login = await agent.post('/api/auth/login').set('x-csrf-token', csrf).send({
      email: 'jane@example.com',
      password: 'Strong!Pass123'
    });

    const csrfToken = login.body.data.csrfToken;
    const response = await agent
      .post('/api/auth/complete-onboarding')
      .set('x-csrf-token', csrfToken)
      .send({
        organizationName: 'Sunave Inc',
        industry: 'Technology',
        country: 'US'
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.data.organization.name).toBe('Sunave Inc');
  });

  it('generates and consumes password reset token', async () => {
    const forgotAgent = request.agent(app);
    const forgotCsrf = await fetchCsrf(forgotAgent);
    const forgot = await forgotAgent.post('/api/auth/forgot-password').set('x-csrf-token', forgotCsrf).send({
      email: 'jane@example.com'
    });

    expect(forgot.statusCode).toBe(200);
    const token = forgot.body.data.resetToken;

    const resetAgent = request.agent(app);
    const resetCsrf = await fetchCsrf(resetAgent);
    const reset = await resetAgent.post('/api/auth/reset-password').set('x-csrf-token', resetCsrf).send({
      token,
      newPassword: 'EvenStronger!Pass456'
    });

    expect(reset.statusCode).toBe(200);

    const loginAgent = request.agent(app);
    const loginCsrf = await fetchCsrf(loginAgent);
    const relogin = await loginAgent.post('/api/auth/login').set('x-csrf-token', loginCsrf).send({
      email: 'jane@example.com',
      password: 'EvenStronger!Pass456'
    });

    expect(relogin.statusCode).toBe(200);
  });
});
