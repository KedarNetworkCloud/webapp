const request = require('supertest');
const app = require('../app'); // Ensure the correct path to app.js
const sequelize = require('../config/config.js'); // Adjust the path as needed
const User = require('../models/user'); // Adjust path to the User model

describe('User Routes Integration Test', () => {
  const userEmail = 'johnd9@example.com'; // Store the created user's email for cleanup

  beforeAll(async () => {
    // Any setup code can be added here
  });

  afterAll(async () => {
    try {
      // Delete the created user using the email address
      await User.destroy({ where: { email: userEmail } });
    } catch (error) {
      console.error('Error cleaning up user:', error);
      process.exit(1); // Forcefully stop the test run on cleanup failure
    } finally {
      await sequelize.close(); // Close the database connection
    }
  });

  it('should create a new user via POST /v1/user', async () => {
    const newUser = {
      first_name: 'John',
      last_name: 'Doe',
      email: userEmail,
      password: 'Password123'
    };

    const response = await request(app)
      .post('/v1/user') // Match the /v1/user route
      .send(newUser)
      .set('Accept', 'application/json');

    console.log('Response Body:', response.body); // Log the response for debugging
    expect(response.status).toBe(201); // Expect success for user creation
    expect(response.body.email).toBe(userEmail);
  });

  // Add GET request test to fetch the created user details
  it('should retrieve the created user via GET /v1/user/self', async () => {
    const credentials = Buffer.from(`${userEmail}:Password123`).toString('base64');

    const response = await request(app)
      .get('/v1/user/self')
      .set('Authorization', `Basic ${credentials}`)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200); // Expect success for fetching user
    expect(response.body.email).toBe(userEmail);
    expect(response.body.firstName).toBe('John');
    expect(response.body.lastName).toBe('Doe');
  });
});
