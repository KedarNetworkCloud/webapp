const request = require('supertest');
const app = require('../app'); // Ensure the correct path to app.js

// Mock the AWS SDK to prevent S3 errors during tests
jest.mock('aws-sdk', () => {
    const mockS3 = {
        upload: jest.fn().mockReturnThis(),
        promise: jest.fn().mockResolvedValue({ Location: 'mock-url' }),
    };

    return {
        S3: jest.fn(() => mockS3),
    };
});

// Mock the user creation endpoint to always return a success response
jest.mock('../models/user', () => {
    return {
        create: jest.fn().mockResolvedValue({
            id: 'mock-id',
            first_name: 'John',
            last_name: 'Doe',
            email: 'johnd9@example.com',
        }),
    };
});

describe('User Routes Integration Test', () => {
    it('should create a new user via POST /user', async () => {
        const newUser = {
            first_name: 'John',
            last_name: 'Doe',
            email: 'johnd9@example.com',
            password: 'Password123',
        };

        const response = await request(app)
            .post('/v1/user') // Match the /user route
            .send(newUser)
            .set('Accept', 'application/json');

        console.log('Response Body:', response.body); // Log the response for debugging
        expect(response.status).toBe(201); // Expect success for user creation
        expect(response.body.email).toBe(newUser.email);
        expect(response.body.first_name).toBe(newUser.first_name);
        expect(response.body.last_name).toBe(newUser.last_name);
    });
});
