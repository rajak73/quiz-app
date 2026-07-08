const request = require('supertest');
const app = require('../../server');
const User = require('../../models/User');

// Mock google-auth-library
jest.mock('google-auth-library', () => {
  return {
    OAuth2Client: jest.fn().mockImplementation(() => {
      return {
        verifyIdToken: jest.fn().mockImplementation(async ({ idToken }) => {
          if (idToken === 'valid_token') {
            return {
              getPayload: () => ({
                sub: 'google_12345',
                email: 'testuser@google.com',
                name: 'Test Google User',
                picture: 'https://example.com/avatar.jpg'
              })
            };
          } else {
            throw new Error('Invalid token');
          }
        })
      };
    })
  };
});

describe('Google Auth Integration Tests', () => {

  it('should register a new user successfully with a valid google token', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({ credential: 'valid_token' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('testuser@google.com');

    // Check DB
    const dbUser = await User.findOne({ email: 'testuser@google.com' });
    expect(dbUser).toBeTruthy();
    expect(dbUser.googleId).toBe('google_12345');
    expect(dbUser.authProvider).toBe('google');
    expect(dbUser.isVerified).toBe(true);
  });

  it('should log in an existing user with a valid google token', async () => {
    // Manually create user first
    await User.create({
      name: 'Existing User',
      email: 'testuser@google.com',
      googleId: 'google_12345',
      authProvider: 'google',
      isVerified: true
    });

    const res = await request(app)
      .post('/api/auth/google')
      .send({ credential: 'valid_token' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should reject an invalid google token', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({ credential: 'invalid_token' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid Google token');
  });

});
