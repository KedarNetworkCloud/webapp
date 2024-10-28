const request = require('supertest');
const app = require('../app'); // Ensure the correct path to app.js
const sequelize = require('../config/config.js'); // Adjust the path as needed
const AppUser = require('../models/user'); // Adjust path to the AppUser model

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

describe('User Routes Integration Test', () => {
    const userEmail = 'johnd9@example.com'; // Store the created user's email for cleanup

    beforeAll(async () => {
        try {
            // Drop both tables (ensure you drop dependent tables first)
            await sequelize.getQueryInterface().dropTable('UserImages'); // Drop dependent table first
            await sequelize.getQueryInterface().dropTable('AppUsers'); // Then drop the main table
    
            // Synchronize the database with the models
            await sequelize.sync({ force: true }); // Recreate both tables
            console.log('Database synchronized successfully.');
        } catch (error) {
            console.error('Error resetting database:', error.message || error);
        }
    });

    afterAll(async () => {
        try {
            const user = await AppUser.findOne({ where: { email: userEmail } });
            if (user) {
                await AppUser.destroy({ where: { email: userEmail } });
            }
        } catch (error) {
            console.error('Error cleaning up user:', error.message || error);
            process.exit(1); // Forcefully stop the test run on cleanup failure
        } finally {
            await sequelize.close(); // Close the database connection
        }
    });

    it('should create a new user via POST /user', async () => {
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
});