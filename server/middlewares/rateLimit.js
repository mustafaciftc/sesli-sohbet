const rateLimit = require('express-rate-limit');

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Çok fazla istek gönderildi, lütfen 15 dakika sonra tekrar deneyin.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 5, // 5 giriş denemesi
  message: {
    success: false,
    message: 'Çok fazla giriş denemesi, lütfen 1 saat sonra tekrar deneyin.'
  }
});

const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 dakika
  max: 30, // 30 mesaj/dakika
  message: {
    success: false,
    message: 'Çok hızlı mesaj gönderiyorsunuz, lütfen bekleyin.'
  }
});

module.exports = { generalLimiter, authLimiter, messageLimiter };