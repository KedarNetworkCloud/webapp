const { sequelize } = require('../config/config.js'); // Update with the correct path to your Sequelize instance
const { checkDBConnection } = require('../routes/routes.js'); // Update with the correct path to your function

describe('checkDBConnection', () => {
    it('should set dbConnectionStatus to true if DB connection is successful', async () => {
        // Mocking sequelize.authenticate to resolve successfully
        sequelize.authenticate = jest.fn().mockResolvedValue(true);

        let dbConnectionStatus = false;
        await checkDBConnection();
        
        expect(sequelize.authenticate).toHaveBeenCalled();
        expect(dbConnectionStatus).toBe(true);
    });

    it('should set dbConnectionStatus to false if DB connection fails', async () => {
        // Mocking sequelize.authenticate to throw an error
        sequelize.authenticate = jest.fn().mockRejectedValue(new Error('Connection failed'));

        let dbConnectionStatus = true;
        await checkDBConnection();

        expect(sequelize.authenticate).toHaveBeenCalled();
        expect(dbConnectionStatus).toBe(false);
    });
});
