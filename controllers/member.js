const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Validasi Email
const isEmailValid = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};


const register = async (req, res) => {
    
  const { email, first_name, last_name, password } = req.body;

  // Check
  if (!email || !first_name || !last_name || !password) {
    return res.status(400).json({
      status: 102,
      message: "Semua parameter harus diisi",
      data: null
    });
  }

  if (!isEmailValid(email)) {
    return res.status(400).json({
      status: 102,
      message: "Paramter email tidak sesuai format",
      data: null
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      status: 102,
      message: "Password harus minimal 8 karakter",
      data: null
    });
  }

  
  const user = await pool.connect();
  try {
    await user.query('BEGIN');

    // Unique User Check
    const checkUserQuery = 'SELECT id FROM user_table WHERE email = $1';
    const existingUser = await user.query(checkUserQuery, [email]);
    if (existingUser.rows.length > 0) {
      await user.query('ROLLBACK');
      return res.status(400).json({
        status: 102,
        message: "Email sudah terdaftar",
        data: null
      });
    }

    
    const hashedPassword = await bcrypt.hash(password, 10);

    // Masukan User
    const insertUserQuery = `
      INSERT INTO user_table (email, first_name, last_name, password) VALUES ($1, $2, $3, $4) RETURNING id
    `;
    const userResult = await user.query(insertUserQuery, [email, first_name, last_name, hashedPassword]);
    const userId = userResult.rows[0].id;

    // Masukan Saldo
    const insertSaldoQuery = 'INSERT INTO saldo (user_id, balance) VALUES ($1, $2)';
    await user.query(insertSaldoQuery, [userId, 0.00]);

    await user.query('COMMIT');

    return res.status(200).json({
      status: 0,
      message: "Registrasi berhasil silahkan login",
      data: null
    });
  } catch (error) {
    await user.query('ROLLBACK');
    console.error('Registration Error:', error.message);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
      data: null
    });
  } finally {
    user.release();
  }
};

const login = async (req, res) => {
    
  const { email, password } = req.body;

  // Check
  if (!email || !password) {
    return res.status(400).json({
      status: 102,
      message: "Email dan password harus diisi",
      data: null
    });
  }

  if (!isEmailValid(email)) {
    return res.status(400).json({
      status: 102,
      message: "Paramter email tidak sesuai format",
      data: null
    });
  }

  try {

    // Chack Database
    const query = 'SELECT * FROM user_table WHERE email = $1';
    const { rows } = await pool.query(query, [email]);

    if (rows.length === 0) {
      return res.status(401).json({
        status: 103,
        message: "Username atau password salah",
        data: null
      });
    }

    const user = rows[0];

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        status: 103,
        message: "Username atau password salah",
        data: null
      });
    }

    // JWT
    const tokenSecret = process.env.JWT_SECRET || 'SUPER_SECRET_KEY_CHANGE_ME';
    const token = jwt.sign(
      { email: user.email }, 
      tokenSecret, 
      { expiresIn: '12h' }
    );

    return res.status(200).json({
      status: 0,
      message: "Login Sukses",
      data: { token }
    });
  } catch (error) {
    console.error('Login Error:', error.message);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
      data: null
    });
  }
};

module.exports = {
  register,
  login
};