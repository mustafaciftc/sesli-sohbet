const jwt = require('jsonwebtoken');

const VALID_ROLES = ['admin', 'user', 'guest'];

const TOKEN_EXPIRES = {
  guest: 24 * 60 * 60, // 24 saat
  user: 7 * 24 * 60 * 60, // 7 gün
  admin: 30 * 24 * 60 * 60, // 30 gün
  refresh: 30 * 24 * 60 * 60 // 30 gün
};

const generateRefreshToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }

  const payload = {
    userId,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000),
    iss: 'voice-chat-app',
    aud: 'voice-chat-refresh'
  };

  return jwt.sign(payload, process.env.JWT_SECRET, { 
    expiresIn: TOKEN_EXPIRES.refresh,
    algorithm: 'HS256',
    jwtid: `refresh_${userId}_${Date.now()}`
  });
};

const generateToken = (userId, role = 'user') => {
  console.log('🔧 generateToken called with:', { userId, role });
  
  if (!process.env.JWT_SECRET) {
    console.log('❌ JWT_SECRET not configured');
    throw new Error('JWT_SECRET not configured');
  }

  // userId kontrolü
  if (!userId || userId === 'undefined' || userId === 'null') {
    console.log('❌ Invalid userId:', userId);
    throw new Error('Geçersiz userId: ' + userId);
  }

  // Role güvenlik kontrolü
  const validRoles = ['admin', 'user', 'guest'];
  const userRole = validRoles.includes(role) ? role : 'user';
  
  console.log('🔍 Final token payload:', { userId, role: userRole });

  const payload = {
    userId: userId, // Açıkça userId kullan
    role: userRole,
    iat: Math.floor(Date.now() / 1000),
    iss: 'voice-chat-app',
    aud: 'voice-chat-users'
  };

  try {
    const token = jwt.sign(payload, process.env.JWT_SECRET, { 
      expiresIn: '24h',
      algorithm: 'HS256'
    });
    
    console.log('✅ Token generated successfully');
    return token;
  } catch (error) {
    console.error('❌ JWT sign error:', error);
    throw new Error('Token oluşturulamadı: ' + error.message);
  }
};

const verifyToken = (token, options = {}) => {
  try {
    console.log('🔧 verifyToken called with token:', token ? `${token.substring(0, 30)}...` : 'NULL');
    
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔍 Token decoded:', decoded);

    // Ek doğrulamalar
    if (!decoded.userId) {
      console.log('❌ Token missing userId:', decoded);
      return { 
        valid: false, 
        error: 'Geçersiz token: userId eksik',
        decoded: null 
      };
    }

    if (decoded.role && !['admin', 'user', 'guest'].includes(decoded.role)) {
      console.log('❌ Token has invalid role:', decoded.role);
      return { 
        valid: false, 
        error: 'Geçersiz token: bilinmeyen role',
        decoded: null 
      };
    }

    return { 
      valid: true, 
      decoded,
      isExpiringSoon: isTokenExpiringSoon(decoded.exp)
    };
  } catch (error) {
    console.error('❌ Token verification error:', error.message);
    return { 
      valid: false, 
      error: getErrorMessage(error),
      expired: error.name === 'TokenExpiredError'
    };
  }
};

const isTokenExpiringSoon = (expirationTime) => {
  if (!expirationTime) return false;
  const now = Math.floor(Date.now() / 1000);
  const oneHour = 60 * 60;
  return (expirationTime - now) < oneHour;
};

const getErrorMessage = (error) => {
  const errorMessages = {
    'TokenExpiredError': 'Token süresi dolmuş',
    'JsonWebTokenError': 'Geçersiz token',
    'NotBeforeError': 'Token henüz geçerli değil'
  };

  return errorMessages[error.name] || error.message || 'Token doğrulama hatası';
};

const decodeTokenSafe = (token) => {
  try {
    if (!token) return null;
    
    const decoded = jwt.decode(token);
    if (!decoded) return null;

    return {
      userId: decoded.userId,
      role: decoded.role || 'user',
      expiresAt: decoded.exp ? new Date(decoded.exp * 1000) : null,
      issuedAt: decoded.iat ? new Date(decoded.iat * 1000) : null
    };
  } catch (error) {
    console.error('Token decode error:', error);
    return null;
  }
};

const isGuestToken = (token) => {
  const decoded = decodeTokenSafe(token);
  return decoded ? decoded.role === 'guest' : false;
};

const isAdminToken = (token) => {
  const decoded = decodeTokenSafe(token);
  return decoded ? decoded.role === 'admin' : false;
};

const canRefreshToken = (refreshToken, originalToken) => {
  try {
    const refreshResult = verifyToken(refreshToken, { audience: 'voice-chat-refresh' });
    if (!refreshResult.valid) return false;

    const originalDecoded = decodeTokenSafe(originalToken);
    if (!originalDecoded) return false;

    return refreshResult.decoded.userId === originalDecoded.userId;
  } catch (error) {
    return false;
  }
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  decodeTokenSafe,
  isGuestToken,
  isAdminToken,
  canRefreshToken,
  VALID_ROLES,
  TOKEN_EXPIRES
};