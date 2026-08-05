const request = require('supertest');

// This must run before `require('../../server')` below: googleAuthController.js does
// `const client = new OAuth2Client(...)` once at module-load time (not per-request), so the
// mock's OAuth2Client constructor only ever runs once — the object it returns (and therefore
// this verifyIdToken reference) is what `client` holds for the whole test file. There's no
// babel config in this project, so jest.mock() calls are NOT hoisted above requires the way
// they would be under babel-jest's hoist transform — order here is real execution order.
const mockVerifyIdToken = jest.fn();

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken
  }))
}));

const app = require('../../server');
const User = require('../../models/User');

describe('Google Auth Integration Tests', () => {

  // jest.config.js sets resetMocks: true, which wipes mockImplementation from every jest.fn()
  // before each test, so we re-arm mockVerifyIdToken here rather than relying on the
  // implementation set inside jest.mock()'s factory above (that only runs once).

  beforeEach(() => {
    mockVerifyIdToken.mockImplementation(async ({ idToken }) => {
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
    });
  });

  it('should register a new user successfully with a valid google token', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .send({ credential: 'valid_token' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('testuser@google.com');

    // Check DB (googleId is `select: false` on the schema, so it must be selected explicitly)
    const dbUser = await User.findOne({ email: 'testuser@google.com' }).select('+googleId');
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
