const express = require('express');
const router = express.Router();
const memberController = require('../controllers/member');

// Public access routes
router.post('/registration', memberController.register);
router.post('/login', memberController.login);

module.exports = router;