const request = require('supertest');
const app = require('../app'); // Ensure the correct path to `app.js`

describe('User Routes Integration Test', () => {
  it('should create a new user via POST /v1/user', async () => {
    const newUser = {
      first_name: 'John',
      last_name: 'Doe',
      email: 'johndo@example.com',
      password: 'Password123'
    };

    const response = await request(app)
      .post('/v1/user') // Match the /v1/user route
      .send(newUser)
      .set('Accept', 'application/json');

    expect(response.status).toBe(201); // Expect success for user creation
    expect(response.body.email).toBe('johndo@example.com');
  });

  it('should retrieve the created user via GET /v1/user/self', async () => {
    const response = await request(app)
      .get('/v1/user/self') // Match the /v1/user/self route
      .set('Authorization', 'Basic ' + Buffer.from('johndo@example.com:Password123').toString('base64'));

    expect(response.status).toBe(200); // Expect success for user retrieval
    expect(response.body.email).toBe('johndo@example.com');
    expect(response.body.firstName).toBe('John');
    expect(response.body.lastName).toBe('Doe');
  });
});
