const jwt = require('jsonwebtoken');
const { query } = require('../db');

const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    if (!process.env.JWT_SECRET) {
      return next(new Error('Server configuration error'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const users = await query(
      'SELECT id, username, email FROM users WHERE id = ?',
      [decoded.userId || decoded.id]
    );

    if (users.length === 0) {
      return next(new Error('Authentication error: User not found'));
    }

    socket.user = users[0];
    next();
  } catch (error) {
    console.error('Socket auth error:', error);
    next(new Error('Authentication error: Invalid token'));
  }
};

module.exports = socketAuth;