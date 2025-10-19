const { body, param, validationResult } = require('express-validator');
let sanitizeHtml;
try {
  sanitizeHtml = require('sanitize-html');
} catch (error) {
  console.warn('⚠️ sanitize-html not installed, skipping sanitization (install with `npm install sanitize-html`)');
  sanitizeHtml = (value) => value; 
}

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      message: 'Validation error',
      errors: errors.array() 
    });
  }
  next();
};

const sanitizeInput = (value) => {
  return sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {}
  });
};

const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be 3-50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .customSanitizer(sanitizeInput),
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('Enter a valid email address')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  validate
];

const loginValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Enter a valid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  validate
];

const guestValidation = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 2, max: 20 })
    .withMessage('Username must be 2-20 characters')
    .matches(/^[a-zA-Z0-9ğüşöçıİĞÜŞÖÇ\s\-_]+$/)
    .withMessage('Username can only contain letters, numbers, spaces, dash and underscore')
    .customSanitizer(sanitizeInput),
  
  validate
];

const createRoomValidation = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Room name must be 3-100 characters')
    .notEmpty()
    .withMessage('Room name is required')
    .customSanitizer(sanitizeInput),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
    .customSanitizer(sanitizeInput),
  
  body('max_participants')
    .optional()
    .isInt({ min: 2, max: 100 })
    .withMessage('Max participants must be between 2 and 100')
    .toInt(),
  
  validate
];

const updateRoomValidation = [
  param('id')
    .isInt()
    .withMessage('Invalid room ID')
    .toInt(),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Room name must be 3-100 characters')
    .customSanitizer(sanitizeInput),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
    .customSanitizer(sanitizeInput),
  
  body('max_participants')
    .optional()
    .isInt({ min: 2, max: 100 })
    .withMessage('Max participants must be between 2 and 100')
    .toInt(),
    
  validate
];

const roomIdValidation = [
  param('id')
    .isInt()
    .withMessage('Invalid room ID')
    .toInt(),
  
  validate
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  guestValidation,
  createRoomValidation,
  updateRoomValidation,
  roomIdValidation
};