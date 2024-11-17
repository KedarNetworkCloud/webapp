const request = require('supertest');
const app = require('../app'); // Ensure the correct path to app.js

describe('Health Check Middleware Test', () => {
    it('should return 200 for /health when DB is connected', async () => {
        const response = await request(app)
            .get('/healthz') // Hit the health check endpoint
            .set('Accept', 'application/json');

        expect(response.status).toBe(200); // Expect 200 OK
    });
});
