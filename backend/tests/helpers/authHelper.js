const request = require('supertest');
const app = require('../../server');

/**
 * Helper to log in a user and return the HTTP-only cookie
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<string>} The cookie string to be used in subsequent requests
 */
const getAuthCookie = async (email, password) => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  
  if (response.status !== 200) {
    throw new Error(`Login failed in getAuthCookie: ${response.body.message}`);
  }

  const cookies = response.headers['set-cookie'];
  if (!cookies) throw new Error('No cookie returned upon login');

  // Find the token cookie
  const tokenCookie = cookies.find(cookie => cookie.startsWith('token='));
  return tokenCookie.split(';')[0]; // Return just the token=... part
};

module.exports = {
  getAuthCookie
};
