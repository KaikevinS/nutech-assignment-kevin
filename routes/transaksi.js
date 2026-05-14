const express = require('express');
const router = express.Router();
const transaksiController = require('../controllers/transaksi');
const authGuard = require('../middleware/auth');


router.get('/balance', authGuard, transaksiController.getBalance);
router.post('/topup', authGuard, transaksiController.topUp);
router.post('/transaction', authGuard, transaksiController.createTransaksi);

module.exports = router;