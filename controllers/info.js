const pool = require('../config/db');

// Ambil Banner
const getBanners = async (req, res) => {
  try {
    
    const query = 'SELECT banner_name, banner_image, description FROM banner';
    const { rows } = await pool.query(query);

    return res.status(200).json({
      status: 0,
      message: "Sukses",
      data: rows
    });
  } catch (error) {
    console.error('Error fetching banners:', error.message);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
      data: null
    });
  }
};

// Ambil Services
const getServices = async (req, res) => {
  try {
    
    const query = 'SELECT service_code, service_name, service_icon, service_tariff AS service_tariff FROM service';
    const { rows } = await pool.query(query);

    return res.status(200).json({
      status: 0,
      message: "Sukses",
      data: rows
    });
  } catch (error) {
    console.error('Error fetching services:', error.message);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
      data: null
    });
  }
};

module.exports = {
  getBanners,
  getServices
};