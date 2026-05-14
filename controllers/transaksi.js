const pool = require('../config/db');

// Invoice Generator
const generateInvoiceNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomId = Math.floor(1000 + Math.random() * 9000);
  return `INV${dateStr}-${randomId}`;
};

const getBalance = async (req, res) => {
  try {
    const query = `
      SELECT s.balance as balance FROM saldo s JOIN user_table u ON s.user_id = u.id WHERE u.email = $1
    `;
    const { rows } = await pool.query(query, [req.userEmail]);

    if (rows.length === 0) {
      return res.status(404).json({ status: 102, message: "User tidak ditemukan", data: null });
    }

    return res.status(200).json({
      status: 0,
      message: "Get Balance Berhasil",
      data: { balance: rows[0].balance }
    });
  } catch (error) {
    console.error('Balance Error:', error.message);
    return res.status(500).json({ status: 500, message: "Internal Server Error", data: null });
  }
};

const topUp = async (req, res) => {
  const { top_up_amount } = req.body;

  // Check
  if (typeof top_up_amount !== 'number' || top_up_amount < 0) {
    return res.status(400).json({
      status: 102,
      message: "Paramter amount hanya boleh angka dan tidak boleh lebih kecil dari 0",
      data: null
    });
  }

  const client = await pool.connect();
  try {
    // Connect Database
    await client.query('BEGIN');

    // Ambil User
    const userQuery = 'SELECT id FROM user_table WHERE email = $1';
    const userRes = await client.query(userQuery, [req.userEmail]);
    
    if (userRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        status: 102,
        message: "User tidak ditemukan",
        data: null
      });
    }
    
    const userId = userRes.rows[0].id;

    // Tambah Saldo
    const updateSaldoQuery = `
      UPDATE saldo 
      SET balance = balance + $1 
      WHERE user_id = $2 
      RETURNING CAST(balance AS INTEGER) as balance
    `;
    const saldoRes = await client.query(updateSaldoQuery, [top_up_amount, userId]);

    const insertTxQuery = `
      INSERT INTO transaksi (invoice_number, user_id, transaction_type, description, total_amount) VALUES ($1, $2, $3, $4, $5)
    `;
    const invoiceNumber = generateInvoiceNumber();
    await client.query(insertTxQuery, [
      invoiceNumber, 
      userId, 
      'TOPUP', 
      'Top Up Balance', 
      top_up_amount
    ]);

    await client.query('COMMIT');

    return res.status(200).json({
      status: 0,
      message: "Top Up Balance berhasil",
      data: {
        balance: saldoRes.rows[0].balance
      }
    });

  } catch (error) {
    // Rollback
    await client.query('ROLLBACK');
    console.error('Top Up Error:', error.message);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
      data: null
    });
  } finally {
    // Tutup Database Connection
    client.release();
  }
};


const createTransaksi = async (req, res) => {
  const { service_code } = req.body;

  // Check
  if (!service_code) {
    return res.status(400).json({
      status: 102,
      message: "Service code harus diisi",
      data: null
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check service
    const serviceQuery = 'SELECT service_name, service_tariff FROM service WHERE service_code = $1';
    const serviceRes = await client.query(serviceQuery, [service_code]);

    if (serviceRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        status: 102,
        message: "Service ataus Layanan tidak ditemukan",
        data: null
      });
    }

    const { service_name, service_tariff } = serviceRes.rows[0];
    const cost = parseFloat(service_tariff);

    // Ambil User
    const userQuery = `
      SELECT u.id, s.balance FROM user_table u 
      JOIN saldo s ON u.id = s.user_id 
      WHERE u.email = $1 FOR UPDATE
    `;
    const userRes = await client.query(userQuery, [req.userEmail]);
    const userId = userRes.rows[0].id;
    const currentBalance = parseFloat(userRes.rows[0].balance);

    // Check Saldo
    if (currentBalance < cost) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        status: 102,
        message: "Saldo tidak mencukupi",
        data: null
      });
    }

    // Kurangi Saldo
    const deductQuery = 'UPDATE saldo SET balance = balance - $1 WHERE user_id = $2';
    await client.query(deductQuery, [cost, userId]);

    // Buat Invoice
    const invoiceNumber = generateInvoiceNumber(); // Uses your existing invoice generator function
    const insertTxQuery = `
      INSERT INTO transaksi (invoice_number, user_id, transaction_type, description, total_amount) VALUES ($1, $2, $3, $4, $5) RETURNING created_on
    `;
    const txRes = await client.query(insertTxQuery, [
      invoiceNumber, 
      userId, 
      'PAYMENT', 
      service_name, 
      cost
    ]);

    await client.query('COMMIT');

    return res.status(200).json({
      status: 0,
      message: "Transaksi berhasil",
      data: {
        invoice_number: invoiceNumber,
        service_code: service_code,
        service_name: service_name,
        transaction_type: "PAYMENT",
        total_amount: parseInt(cost), // Keep output matching structural types
        created_on: txRes.rows[0].created_on
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction Error:', error.message);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
      data: null
    });
  } finally {
    client.release();
  }
};

module.exports = {
  topUp,
  getBalance,
  createTransaksi
};