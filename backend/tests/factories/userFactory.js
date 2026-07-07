const User = require('../../models/User');
const bcrypt = require('bcryptjs');

const createTestUser = async (overrides = {}) => {
  const defaultUser = {
    name: 'Test Factory User',
    email: `test_${Date.now()}@example.com`,
    password: 'Password123!',
    phone: '9876543210',
    isVerified: true,
    role: 'user'
  };

  const userData = { ...defaultUser, ...overrides };
  
  // Hash password manually to bypass pre-save hook if needed, or rely on model
  const user = new User(userData);
  await user.save();
  return user;
};

module.exports = {
  createTestUser
};
