const express = require('express');
const bcrypt = require('bcrypt');
const AppUser = require('../models/user.js');  // Changed User to AppUser
const UserImage = require('../models/userImage.js');
const sequelize = require('../config/config.js');
const { Op } = require('sequelize');
const AWS = require('aws-sdk');
const multer = require('multer'); // Assuming you're using multer for file uploads
const StatsD = require('node-statsd');
const statsdConfig = require('../config/statsDconfig.json'); // Adjust the path to your config file
const statsd = new StatsD({ host: statsdConfig.host, port: statsdConfig.port });
const sns = new AWS.SNS();

const upload = multer({ /* Multer configuration */ });
const router = express.Router();
const logger = require('../logger'); // Import logger
const s3 = new AWS.S3(); // Create an S3 instance

// Check DB connection function
async function checkDBConnection() {
    try {
        await sequelize.authenticate();
        return true;
    } catch (error) {
        return false; 
    }
}

// Middleware to check DB connection
const checkDBMiddleware = async (req, res, next) => {
    const dbConnectionStatus = await checkDBConnection();
    if (!dbConnectionStatus) {
        logger.error('Database connectivity error.'); // Log bad request response
        return res.status(503).json();
    }
    next();
};

// User route definitions
router.head('/user', checkDBMiddleware, async (req, res) => {
    statsd.increment('api.calls.unallowed.method.atuser');  // Increment API call count
    const apiStartTime = Date.now();
    statsd.timing('api.response_time.bad_request.atuser', Date.now() - apiStartTime);
    logger.error('Method not allowed.'); // Log bad request response
    return res.status(405).set('Cache-Control', 'no-cache').send();
});

router.head('/user/self', checkDBMiddleware, async (req, res) => {
    statsd.increment('api.calls.unallowed.method.atuser/self');  // Increment API call count
    const apiStartTime = Date.now();
    statsd.timing('api.response_time.bad_request.atuser/self', Date.now() - apiStartTime);
    logger.error('Method not allowed.'); // Log bad request response
    return res.status(405).set('Cache-Control', 'no-cache').send();
});

router.head('/user/self/pic', checkDBMiddleware, async (req, res) => {
    statsd.increment('api.calls.unallowed.method.atuser/self/pic');  // Increment API call count
    const apiStartTime = Date.now();
    statsd.timing('api.response_time.bad_request.atuser/self/pic', Date.now() - apiStartTime);
    logger.error('Method not allowed.'); // Log bad request response
    return res.status(405).set('Cache-Control', 'no-cache').send();
});


const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return res.status(401).json();
    }

    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [email, password] = credentials.split(':');

    try {
        // Start timing the database query
        const dbQueryStartTime = Date.now();

        const user = await AppUser.findOne({
            where: { email: { [Op.iLike]: email } }
        });

        // Record the time taken for the database query
        statsd.timing('db.query_time.authMiddleware', Date.now() - dbQueryStartTime);

        if (!user) {
            logger.error("No such user exists.");
            return res.status(401).json();
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            logger.error("Password doesn't match.");
            return res.status(401).json();
        }

        // Check if the user is verified
        if (!user.verified) {
            logger.error("User is not verified.");
            return res.status(403).json();
        }

        req.user = user;
        next();
    } catch (error) {
        logger.error("Error during User Authentication via basic auth.");
        console.error('Error during authentication:', error);
        return res.status(500).json();
    }
};


const { v4: uuidv4 } = require('uuid'); // Import UUID

router.post('/user', checkDBMiddleware, async (req, res) => {
    const startTime = Date.now(); // Start measuring execution time
    const { first_name, last_name, password, email } = req.body;
    res.set('Cache-Control', 'no-cache');

    // API Counter
    statsd.increment('api.user.create.counter');

    const allowedFields = ['first_name', 'last_name', 'password', 'email', 'account_created', 'account_updated'];
    
    const requestFields = Object.keys(req.body);
    const invalidFields = requestFields.filter(field => !allowedFields.includes(field));

    if (invalidFields.length > 0) {
        logger.error('Invalid fields included.'); // Log bad request response
        return res.status(400).json();
    }

    if (!first_name || !last_name || !password || !email) {
        logger.error('Required fields missing.'); // Log bad request response
        return res.status(400).json();
    }

    const alphanumericRegex = /^[a-z0-9]+$/i;
    if (!alphanumericRegex.test(first_name) || !alphanumericRegex.test(last_name)) {
        return res.status(400).json();
    }

    try {
        if (Object.keys(req.query).length > 0) {
            return res.status(400).json();
        }

        const emailRegex = /^[a-zA-Z0-9](\.?[a-zA-Z0-9_-]+)*@[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json();
        }

        // Measure DB Query Time for existing user check
        const dbStartTime = Date.now();
        const existingUser = await AppUser.findOne({ where: { email } });
        const dbQueryTime = Date.now() - dbStartTime; // Calculate time taken for the DB query
        statsd.timing('api.user.create.db.query.time', dbQueryTime); // Log DB query time

        if (existingUser) {
            return res.status(400).json();
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Measure DB Query Time for user creation
        const userCreationStartTime = Date.now();
        const newUser = await AppUser.create({
            email,
            password: hashedPassword,
            firstName: first_name,
            lastName: last_name,
        });
        const userCreationTime = Date.now() - userCreationStartTime; // Calculate time taken for the DB operation
        statsd.timing('api.user.create.db.creation.time', userCreationTime); // Log user creation time

        logger.info('New User created.'); // Log user creation
        const executionTime = Date.now() - startTime; // Calculate total execution time
        statsd.timing('api.user.create.execution.time', executionTime); // Log total execution time

        // Generate a new token for the user
        const token = uuidv4(); // Generate a new unique token

        // Store the token in the user's model (verificationToken column)
        newUser.verificationToken = token;
        await newUser.save();  // Save the updated user with the verificationToken

        // Prepare the message for SNS
        const snsMessage = {
            Message: JSON.stringify({
                email: newUser.email,
                token: token, // Use the newly generated token
                BASE_URL: "http://demo.csye6225kedar.xyz/v2"
            }),
            TopicArn: process.env.SNS_TOPIC_ARN
        };

        // Publish the message to SNS
        sns.publish(snsMessage, (err, data) => {
            if (err) {
                console.error("Error publishing message to SNS:", err);
            } else {
                console.log("SNS message published successfully:", data);
            }
        });

        return res.status(201).json({
            id: newUser.id,
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            account_created: newUser.account_created,
            account_updated: newUser.account_updated,
        });
    } catch (error) {
        logger.error("Error during creating user.")
        console.error('Error creating user:', error);
        return res.status(500).json();
    }
});


router.get('/verify', async (req, res) => {
    const { user, token } = req.query;

    // Validate query parameters
    if (!user || !token) {
        return res.status(400).json({ message: 'User email and token are required.' });
    }

    try {
        // Fetch user from the database using email
        const userRecord = await AppUser.findOne({ where: { email: user } });

        if (!userRecord) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Check if the token matches the user's stored verification token
        if (userRecord.verificationToken !== token) {
            return res.status(400).json({ message: 'Invalid token.' });
        }

        // Check if the email verification was sent more than 2 minutes ago
        if (!userRecord.verificationEmailSentAt) {
            return res.status(400).json({ message: 'Verification email was never sent.' });
        }

        const timeDifference = Date.now() - new Date(userRecord.verificationEmailSentAt).getTime();
        if (timeDifference > 2 * 60 * 1000) { // 2 minutes in milliseconds
            return res.status(400).json({ message: 'Verification token expired.' });
        }

        // Mark the user as verified
        userRecord.verified = true;
        await userRecord.save();

        return res.status(200).json({ message: 'Email verified successfully.' });
    } catch (error) {
        console.error('Error during verification:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});



// Update user
router.put('/user/self', checkDBMiddleware, authMiddleware, async (req, res) => {
    const startTime = Date.now(); // Start measuring execution time
    const { first_name, last_name, password } = req.body;
    res.set('Cache-Control', 'no-cache');

    // API Counter
    statsd.increment('api.user.update.counter');

    const fieldsAllowedToBeUpdated = ['first_name', 'last_name', 'password'];
    for (let key in req.body) {
        if (!fieldsAllowedToBeUpdated.includes(key)) {
            return res.status(400).json();
        }
    }

    const alphanumericRegex = /^[a-z0-9]+$/i;
    if (!alphanumericRegex.test(last_name) || !alphanumericRegex.test(first_name)) {
        return res.status(400).json();
    }

    try {
        if (Object.keys(req.query).length > 0) {
            return res.status(400).json();
        }

        const user = req.user;

        if (first_name) user.firstName = first_name;
        if (last_name) user.lastName = last_name;

        if (password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        // Measure DB Query Time for user update
        const dbUpdateStartTime = Date.now();
        await user.save();
        const dbUpdateTime = Date.now() - dbUpdateStartTime; // Calculate time taken for the DB operation
        statsd.timing('api.user.update.db.save.time', dbUpdateTime); // Log DB update time

        logger.info('Authenticated User information updated.'); // Log bad request response

        const executionTime = Date.now() - startTime; // Calculate total execution time
        statsd.timing('api.user.update.execution.time', executionTime); // Log total execution time

        return res.status(204).send(); 

    } catch (error) {
        logger.error('Error updating user.'); // Log bad request response
        console.error('Error updating user:', error);
        return res.status(500).json();
    }
});


// Get user details
router.get('/user/self', checkDBMiddleware, authMiddleware, async (req, res) => {
    const startTime = Date.now(); // Start measuring execution time

    // API Counter
    statsd.increment('api.user.get.counter');

    try {
        let contentLength = req.headers['content-length'] ? parseInt(req.headers['content-length'], 10) : 0;

        if (Object.keys(req.query).length > 0) {
            return res.status(400).json();
        }
    
        if (contentLength === 0) {
            res.set('Cache-Control', 'no-cache');

            // Measure DB Query Time for user retrieval
            const dbQueryStartTime = Date.now();
            const userDetails = {
                id: req.user.id,
                email: req.user.email,
                firstName: req.user.firstName,
                lastName: req.user.lastName,
                account_created: req.user.account_created,
                account_updated: req.user.account_updated,
            };
            const dbQueryTime = Date.now() - dbQueryStartTime; // Calculate time taken for DB operation
            statsd.timing('api.user.get.db.query.time', dbQueryTime); // Log DB query time

            logger.info('Authenticated User information retrieved.'); // Log bad request response
            const executionTime = Date.now() - startTime; // Calculate total execution time
            statsd.timing('api.user.get.execution.time', executionTime); // Log total execution time
            
            return res.status(200).json(userDetails);
        } else if (contentLength > 0) {
            return res.status(400).send('');
        }

    } catch (error) {
        console.error('Error retrieving user:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});


// POST /user/self/pic
router.post('/user/self/pic', checkDBMiddleware, authMiddleware, upload.single('profilePic'), async (req, res) => {
    const startTime = process.hrtime(); // Start timing

    if (Object.keys(req.query).length > 0) {
        return res.status(400).json();
    }

    try {
        const { file } = req;

        // Check if a file was uploaded
        if (!file) {
            return res.status(400).json();
        }

        // Validate file type
        const allowedFileTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!allowedFileTypes.includes(file.mimetype)) {
            return res.status(400).json();
        }

        // Check if the user exists
        const existingUser = await AppUser.findOne({ where: { id: req.user.id } });
        if (!existingUser) {
            return res.status(401).json();
        }

        // Check if the user already has a profile image
        const existingImage = await UserImage.findOne({ where: { userId: req.user.id } });
        if (existingImage) {
            return res.status(400).json();
        }

        // Set S3 upload parameters
        const s3Params = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: `${req.user.id}/${file.originalname}`, // Key is now userId/fileName
            Body: file.buffer,
            ContentType: file.mimetype,
        };

        // Measure S3 upload start time
        const s3StartTime = process.hrtime();
        // Upload to S3
        const uploadResult = await s3.upload(s3Params).promise();
        const s3EndTime = process.hrtime(s3StartTime); // Measure S3 upload end time
        const s3Duration = (s3EndTime[0] * 1e9 + s3EndTime[1]) / 1e6; // Convert to milliseconds

        // Create a new entry in the UserImage table
        const newImage = await UserImage.create({
            profile_image_file_name: file.originalname,
            profile_image_url: `${process.env.S3_BUCKET_NAME}/${req.user.id}/${file.originalname}`, // Custom URL format
            profile_image_upload_date: new Date().toISOString(),
            userId: req.user.id, // Associate this image with the user
        });

        await AppUser.update(
            { account_updated: new Date() },
            { where: { id: req.user.id } }
        );

        // Calculate total execution time
        const endTime = process.hrtime(startTime);
        const totalExecutionTime = (endTime[0] * 1e9 + endTime[1]) / 1e6; // Convert to milliseconds

        // Log metrics to StatsD
        statsd.timing('api.user.self.pic.execution_time', totalExecutionTime);
        statsd.timing('api.user.self.pic.s3_upload_time', s3Duration);

        logger.info('Profile Image posted in the S3 bucket for authenticated user.');
        // Return the uploaded image details in the response
        return res.status(201).json({
            file_name: newImage.profile_image_file_name,
            id: newImage.id,
            url: newImage.profile_image_url,
            upload_date: newImage.profile_image_upload_date,
            user_id: newImage.userId,
        });

    } catch (error) {
        console.error('Error uploading image:', error);
        return res.status(500).json();
    }
});


// GET /user/self/pic
router.get('/user/self/pic', checkDBMiddleware, authMiddleware, async (req, res) => {
    statsd.increment('api.calls.GET_user_self_pic');  // Increment API call count
    const apiStartTime = Date.now();

    try {
        if (Object.keys(req.query).length > 0) {
            return res.status(400).json();
        }

        // Database query to retrieve user image details
        const dbQueryStart = Date.now();
        const userImage = await UserImage.findOne({
            where: { userId: req.user.id },
            attributes: ['profile_image_file_name', 'profile_image_url', 'profile_image_upload_date', 'id', 'userId'],
        });
        statsd.timing('db.query_time.GET_user_self_pic', Date.now() - dbQueryStart); // Log DB query time

        // Check if image exists
        if (!userImage) {
            logger.error("User doesn't have an image");  // Log bad request response
            return res.status(404).json();
        }

        statsd.timing('api.response_time.GET_user_self_pic', Date.now() - apiStartTime);  // Log total API response time
        return res.status(200).json({
            file_name: userImage.profile_image_file_name,
            id: userImage.id,
            url: userImage.profile_image_url,
            upload_date: userImage.profile_image_upload_date,
            user_id: userImage.userId,
        });

    } catch (error) {
        logger.error('Error retrieving image:');  // Log bad request response
        console.error('Error retrieving image:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});


// DELETE /user/self/pic
router.delete('/user/self/pic', checkDBMiddleware, authMiddleware, async (req, res) => {
    statsd.increment('api.calls.DELETE_user_self_pic');  // Increment API call count
    const apiStartTime = Date.now();

    try {
        if (Object.keys(req.query).length > 0) {
            return res.status(400).json();
        }

        // Check if the user exists
        const dbUserCheckStart = Date.now();
        const user = await AppUser.findOne({ where: { id: req.user.id } });
        statsd.timing('db.query_time.DELETE_user_self_pic', Date.now() - dbUserCheckStart);  // Log DB query time

        if (!user) {
            logger.error("No such user exists");  // Log bad request response
            return res.status(404).json();
        }

        // Retrieve current profile image details
        const dbImageCheckStart = Date.now();
        const userImage = await UserImage.findOne({ where: { userId: req.user.id } });
        statsd.timing('db.query_time.DELETE_user_self_pic', Date.now() - dbImageCheckStart);  // Log DB query time

        if (!userImage) {
            logger.error("User doesn't have an image");  // Log bad request response
            return res.status(404).json();
        }

        // S3 delete operation
        const s3DeleteStart = Date.now();
        const params = { Bucket: process.env.S3_BUCKET_NAME, Key: `${req.user.id}/${userImage.profile_image_file_name}` };
        await s3.deleteObject(params).promise();
        statsd.timing('s3.delete_time.DELETE_user_self_pic', Date.now() - s3DeleteStart);  // Log S3 deletion time

        // Database deletion of image record
        const dbDeleteStart = Date.now();
        await UserImage.destroy({ where: { userId: req.user.id } });
        statsd.timing('db.query_time.DELETE_user_self_pic', Date.now() - dbDeleteStart);  // Log DB query time for deletion

        statsd.timing('api.response_time.DELETE_user_self_pic', Date.now() - apiStartTime);  // Log total API response time
        return res.status(204).send();  // No Content

    } catch (error) {
        console.error('Error deleting image:', error);
        logger.error('Error deleting image:');  // Log bad request response
        return res.status(500).json({ message: 'Internal server error' });
    }
});


// Additional route definitions for user
router.all('/user', checkDBMiddleware, async (req, res) => {
    statsd.increment('api.calls.all_user');  // Increment API call count
    const apiStartTime = Date.now();

    logger.error('Method not allowed.');  // Log bad request response
    statsd.timing('api.response_time.all_user', Date.now() - apiStartTime);  // Log total API response time
    return res.status(405).set('Cache-Control', 'no-cache').send();
});

router.all('/user/self', checkDBMiddleware, async (req, res) => {
    statsd.increment('api.calls.all_user_self');  // Increment API call count
    const apiStartTime = Date.now();

    logger.error('Method not allowed.');  // Log bad request response
    statsd.timing('api.response_time.all_user_self', Date.now() - apiStartTime);  // Log total API response time
    return res.status(405).set('Cache-Control', 'no-cache').send();
});

router.all('/user/self/pic', checkDBMiddleware, async (req, res) => {
    statsd.increment('api.calls.all_user_self_pic');  // Increment API call count
    const apiStartTime = Date.now();

    logger.error('Method not allowed.');  // Log bad request response
    statsd.timing('api.response_time.all_user_self_pic', Date.now() - apiStartTime);  // Log total API response time
    return res.status(405).set('Cache-Control', 'no-cache').send();
});

// 404 route handler for bad requests
router.use((req, res) => {
    statsd.increment('api.calls.bad_request');  // Increment API call count
    const apiStartTime = Date.now();

    logger.error('Bad Request.');  // Log bad request response
    statsd.timing('api.response_time.bad_request', Date.now() - apiStartTime);  // Log total API response time
    return res.status(404).json();
});

module.exports = { router, checkDBConnection,checkDBMiddleware, authMiddleware };
