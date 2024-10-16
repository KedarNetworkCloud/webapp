const request = require('supertest');
const app = require('../app'); // Ensure the correct path to app.js
const sequelize = require('../config/config.js'); // Adjust the path as needed
const AppUser = require('../models/user'); // Adjust path to the AppUser model

describe('User Routes Integration Test', () => {
  const userEmail = 'johnd9@example.com'; // Store the created user's email for cleanup

  beforeAll(async () => {
    try {
      // Synchronize the database with the models
      await sequelize.sync({ force: true }); // Use force: true to drop and recreate tables
    } catch (error) {
      console.error('Error setting up database:', error);
      process.exit(1); // Exit if there's a setup failure
    }
  });

  afterAll(async () => {
    try {
      const user = await AppUser.findOne({ where: { email: userEmail } }); // Update to AppUser
      if (user) {
        await AppUser.destroy({ where: { email: userEmail } }); // Update to AppUser
      }
    } catch (error) {
      console.error('Error cleaning up user:', error);
      process.exit(1); // Forcefully stop the test run on cleanup failure
    } finally {
      await sequelize.close(); // Close the database connection
    }
  });

  it('should create a new user via POST /user', async () => {  // Ensure endpoint matches exactly
    const newUser = {
      first_name: 'John',
      last_name: 'Doe',
      email: userEmail,
      password: 'Password123'
    };

    const response = await request(app)
      .post('/v1/user') // Match the /user route
      .send(newUser)
      .set('Accept', 'application/json');

    console.log('Response Body:', response.body); // Log the response for debugging
    expect(response.status).toBe(201); // Expect success for user creation
    expect(response.body.email).toBe(userEmail);
    expect(response.body.firstName).toBe(newUser.first_name);
    expect(response.body.lastName).toBe(newUser.last_name);
  });

  it('should return 400 for missing required fields when creating user', async () => {
    const invalidUser = {
      first_name: 'Jane', // missing last name
      email: 'janedoe@example.com',
      password: 'Password123'
    };

    const response = await request(app)
      .post('/v1/user') // Match the /user route
      .send(invalidUser)
      .set('Accept', 'application/json');

    expect(response.status).toBe(400); // Expect error for bad request
  });

});

