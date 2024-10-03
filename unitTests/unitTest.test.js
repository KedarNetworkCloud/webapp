require('dotenv').config(); 

const sequelize = require('../config/config.js');

const { checkDBConnection } = require('../routes/routes.js'); 

describe('checkDBConnection', () => {
    it('should return true if DB connection is successful', async () => {
        sequelize.authenticate = jest.fn().mockResolvedValue(true);
        
        const status = await checkDBConnection();
        expect(sequelize.authenticate).toHaveBeenCalled();
        expect(status).toBe(true);
    });

    it('should return false if DB connection fails', async () => {
        sequelize.authenticate = jest.fn().mockRejectedValue(new Error('Connection failed'));
        
        const status = await checkDBConnection();
        expect(sequelize.authenticate).toHaveBeenCalled();
        expect(status).toBe(false); 
    });
});
