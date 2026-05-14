const express = require('express');
const router = express.Router();
const infoController = require('../controllers/info');

// Map endpoints directly to the controller methods
router.get('/banner', infoController.getBanners);
router.get('/services', infoController.getServices);

module.exports = router;