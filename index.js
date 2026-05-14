const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./config/db');

// Route
const memberRoutes = require('./routes/member');
const infoRoutes = require('./routes/info');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Test database
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring database client:', err.stack);
  }
  console.log('Successfully connected to the database cluster.');
  release();
});


app.use('/', memberRoutes);
app.use('/', infoRoutes);

// 404 Fallback
app.use((req, res) => {
  res.status(404).json({
    status: 404,
    message: "Endpoint not found",
    data: null
  });
});


app.listen(PORT, () => {
  console.log(`Server running smoothly on port ${PORT}`);
});