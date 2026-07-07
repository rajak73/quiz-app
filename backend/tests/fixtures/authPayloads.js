module.exports = {
  validUser: {
    name: 'Test User',
    email: 'test@example.com',
    password: 'Password123!',
    phone: '9876543210'
  },
  invalidEmailUser: {
    name: 'Invalid Email',
    email: 'not-an-email',
    password: 'Password123!',
    phone: '9876543210'
  },
  missingFieldsUser: {
    email: 'missing@example.com'
  },
  loginPayload: {
    email: 'test@example.com',
    password: 'Password123!'
  },
  invalidLoginPayload: {
    email: 'test@example.com',
    password: 'WrongPassword!'
  }
};
