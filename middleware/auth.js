const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 108,
      message: "Token tidak tidak valid atau kadaluwarsa",
      data: null
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const tokenSecret = process.env.JWT_SECRET || 'SUPER_SECRET_KEY_CHANGE_ME';
    const decoded = jwt.verify(token, tokenSecret);
    req.userEmail = decoded.email;
    
    next();
  } catch (error) {
    console.error('JWT Verification Error:', error.message);
    return res.status(401).json({
      status: 108,
      message: "Token tidak tidak valid atau kadaluwarsa",
      data: null
    });
  }
};

module.exports = authMiddleware;