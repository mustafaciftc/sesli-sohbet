const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/authMiddleware');
const { 
  registerValidation, 
  loginValidation,
  guestValidation
} = require('../utils/validation');


/**
 * @route   POST /api/auth/register
 * @desc    Yeni kullanıcı kaydı
 * @access  Public
 */
router.post('/register', registerValidation, authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Kullanıcı girişi
 * @access  Public
 */
router.post('/login', loginValidation, authController.login);

/**
 * @route   POST /api/auth/guest
 * @desc    Misafir girişi
 * @access  Public
 */
router.post('/guest', guestValidation, authController.guestLogin);

/**
 * @route   GET /api/auth/me
 * @desc    Mevcut kullanıcı bilgilerini getir
 * @access  Private (Token gerekli)
 */

router.get('/me', authenticate, authController.getCurrentUser);

/**
 * @route   PUT /api/auth/profile
 * @desc    Kullanıcı profili güncelle
 * @access  Private (Token gerekli)
 */
router.put('/profile', authenticate, authController.updateProfile);

module.exports = router;