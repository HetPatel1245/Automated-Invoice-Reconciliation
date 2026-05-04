const jwt = require('jsonwebtoken');


const verifyToken = (req, res, next) => {
    // Extract the token from the Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    // authHeader is of the form Bearer TOKEN
    // Isolate the actual token string (removing "Bearer ")
    const token = authHeader.split(' ')[1];

    try {
        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

        // Attach the decoded payload to the request
        req.user = decoded;

        // Pass control to the next middleware or controller
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Session expired. Please log in again.' });
        }
        return res.status(403).json({ message: 'Invalid token.' });
    }
};


module.exports = verifyToken;