const express = require('express');
const { register, login, verify } = require('../controller/authController');
const verifyToken = require('../middleware/authMiddleware'); 
const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/verify', verifyToken, verify);

module.exports = router;