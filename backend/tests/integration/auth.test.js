const request = require('supertest');
const app = require('../../server');
const payloads = require('../fixtures/authPayloads');
const { createTestUser } = require('../factories/userFactory');
const { getAuthCookie } = require('../helpers/authHelper');
const User = require('../../models/User');

describe('Auth Integration Tests', () => {
  describe('POST /api/auth/signup', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send(payloads.validUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/Account created successfully/i);
      
      // Verify user in DB
      const user = await User.findOne({ email: payloads.validUser.email });
      expect(user).not.toBeNull();
      expect(user.isVerified).toBe(true); // Is verified by default right now
    });

    it('should fail with invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send(payloads.invalidEmailUser);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/valid email/i);
    });

    it('should fail if email already exists', async () => {
      // Create user first
      await createTestUser({ email: payloads.validUser.email });

      // Try to register again
      const res = await request(app)
        .post('/api/auth/signup')
        .send(payloads.validUser);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already registered/i);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully and return cookie', async () => {
      // Create verified user
      await createTestUser({ 
        email: payloads.loginPayload.email,
        password: payloads.loginPayload.password
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send(payloads.loginPayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();

      // Check HTTP-only cookie
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some(cookie => cookie.includes('token='))).toBe(true);
      expect(cookies.some(cookie => cookie.includes('HttpOnly'))).toBe(true);
    });

    it('should fail with incorrect password', async () => {
      await createTestUser({ 
        email: payloads.invalidLoginPayload.email, 
        password: 'correctPassword' 
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send(payloads.invalidLoginPayload);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/credentials/i);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should get current user profile with valid cookie', async () => {
      const email = 'profile@example.com';
      const password = 'Password123!';
      await createTestUser({ email, password });
      
      const cookie = await getAuthCookie(email, password);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe(email);
    });

    it('should block access without cookie', async () => {
      const res = await request(app)
        .get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
