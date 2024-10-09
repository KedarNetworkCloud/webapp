const request = require('supertest');
const app = require('../app'); // Ensure the correct path to `app.js`
const { sequelize } = require('../config/config.js'); // Adjust the path as needed

describe('User Routes Integration Test', () => {
  // Cleanup after all tests
  afterAll(async () => {
    await sequelize.close(); // Close the database connection
  });

  it('should create a new user via POST /v1/user', async () => {
    const newUser = {
      first_name: 'John',
      last_name: 'Doe',
      email: 'johndope@example.com',
      password: 'Password123'
    };

    const response = await request(app)
      .post('/v1/user') // Match the /v1/user route
      .send(newUser)
      .set('Accept', 'application/json');

    expect(response.status).toBe(201); // Expect success for user creation
    expect(response.body.email).toBe('johndope@example.com');
  });

  it('should retrieve the created user via GET /v1/user/self', async () => {
    const response = await request(app)
      .get('/v1/user/self') // Match the /v1/user/self route
      .set('Authorization', 'Basic ' + Buffer.from('johndope@example.com:Password123').toString('base64'));

    expect(response.status).toBe(200); // Expect success for user retrieval
    expect(response.body.email).toBe('johndope@example.com');
    expect(response.body.first_name).toBe('John'); // Make sure the property name matches your API response
    expect(response.body.last_name).toBe('Doe'); // Make sure the property name matches your API response
  });
});
