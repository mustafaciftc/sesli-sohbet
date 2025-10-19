const { verifyToken, decodeTokenSafe } = require('../utils/jwt');
const { query } = require('../db');

const userCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; 

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Kimlik doğrulama tokenı gerekiyor',
        code: 'MISSING_TOKEN'
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token || token.length < 10) {
      return res.status(401).json({ 
        success: false, 
        message: 'Geçersiz token formatı',
        code: 'INVALID_TOKEN_FORMAT'
      });
    }

    const tokenResult = verifyToken(token);
    
    if (!tokenResult.valid) {
      if (tokenResult.expired) {
        return res.status(401).json({ 
          success: false, 
          message: 'Oturum süresi dolmuş. Lütfen tekrar giriş yapın.',
          code: 'TOKEN_EXPIRED'
        });
      }
      
      return res.status(401).json({ 
        success: false, 
        message: tokenResult.error || 'Geçersiz token',
        code: 'TOKEN_INVALID'
      });
    }

    const { userId, role } = tokenResult.decoded;
    const isGuest = role === 'guest';

    const cacheKey = `user_${userId}`;
    const cachedUser = userCache.get(cacheKey);
    
    if (cachedUser && (Date.now() - cachedUser.timestamp) < CACHE_TTL) {
      req.user = cachedUser.data;
      console.log('✅ User from cache:', cachedUser.data.username);
      return next();
    }

    let userQuery, queryParams;

    if (isGuest) {
      userQuery = 'SELECT id, username, role, created_at FROM users WHERE id = ? AND role = "guest"';
    } else {
      userQuery = 'SELECT id, username, email, role, is_active, created_at FROM users WHERE id = ?';
    }
    queryParams = [userId];

    const users = await query(userQuery, queryParams);

    if (users.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Kullanıcı bulunamadı',
        code: 'USER_NOT_FOUND'
      });
    }

    const user = users[0];

    if (!isGuest && !user.is_active) {
      return res.status(403).json({ 
        success: false, 
        message: 'Hesabınız devre dışı bırakılmış',
        code: 'ACCOUNT_DISABLED'
      });
    }

    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isGuest: isGuest,
      createdAt: user.created_at
    };

    const cacheDuration = isGuest ? CACHE_TTL / 2 : CACHE_TTL;
    userCache.set(cacheKey, {
      data: userData,
      timestamp: Date.now()
    });

    req.user = userData;
    
    if (tokenResult.isExpiringSoon) {
      req.tokenNeedsRefresh = true;
    }
    
    console.log(`✅ Authenticated: ${user.username} (${isGuest ? 'Guest' : user.role})`);
    next();

  } catch (error) {
    console.error('❌ Auth Middleware Error:', error);
    
    res.status(500).json({ 
      success: false, 
      message: 'Kimlik doğrulama başarısız',
      code: 'AUTH_SERVER_ERROR'
    });
  }
};

const authorizeAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Kimlik doğrulama gerekiyor',
      code: 'AUTH_REQUIRED'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Yönetici erişimi gerekiyor',
      code: 'ADMIN_REQUIRED'
    });
  }
  
  console.log(`✅ Admin access: ${req.user.username}`);
  next();
};

const authorizeRoles = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Kimlik doğrulama gerekiyor',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `Bu işlem için ${allowedRoles.join(', ')} yetkisi gerekiyor`,
        code: 'ROLE_NOT_ALLOWED'
      });
    }
    
    next();
  };
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      const decoded = decodeTokenSafe(token);
      
      if (decoded && decoded.userId) {
        const cacheKey = `user_${decoded.userId}`;
        const cachedUser = userCache.get(cacheKey);
        
        if (cachedUser) {
          req.user = cachedUser.data;
        } else {
          const users = await query(
            'SELECT id, username, email, role FROM users WHERE id = ? AND is_active = TRUE',
            [decoded.userId]
          );
          
          if (users.length > 0) {
            const userData = {
              id: users[0].id,
              username: users[0].username,
              email: users[0].email,
              role: users[0].role,
              isGuest: users[0].role === 'guest'
            };
            
            userCache.set(cacheKey, {
              data: userData,
              timestamp: Date.now()
            });
            
            req.user = userData;
          }
        }
      }
    }
    
    next();
  } catch (error) {
    console.log('🔓 Optional auth: Token validation failed, continuing without user');
    next();
  }
};

const simpleAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token gerekiyor',
        code: 'TOKEN_REQUIRED'
      });
    }

    const token = authHeader.split(' ')[1];
    const tokenResult = verifyToken(token);

    if (!tokenResult.valid) {
      return res.status(401).json({ 
        success: false, 
        message: tokenResult.error || 'Geçersiz token',
        code: 'TOKEN_INVALID'
      });
    }

    req.user = { 
      id: tokenResult.decoded.userId,
      role: tokenResult.decoded.role 
    };
    
    next();
  } catch (error) {
    console.error('Simple Auth Error:', error);
    return res.status(401).json({ 
      success: false, 
      message: 'Geçersiz token',
      code: 'TOKEN_INVALID'
    });
  }
};

const createRateLimit = (windowMs = 900000, maxRequests = 100) => { 
  const requests = new Map();
  
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    for (const [key, value] of requests.entries()) {
      if (value < windowStart) {
        requests.delete(key);
      }
    }
    
    const userRequests = requests.get(ip) || [];
    const recentRequests = userRequests.filter(time => time > windowStart);
    
    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Çok fazla istek gönderildi. Lütfen bir süre bekleyin.',
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }
    
    recentRequests.push(now);
    requests.set(ip, recentRequests);
    next();
  };
};

const clearUserCache = (userId = null) => {
  if (userId) {
    userCache.delete(`user_${userId}`);
    console.log(`🧹 Cache cleared for user: ${userId}`);
  } else {
    userCache.clear();
    console.log('🧹 All user cache cleared');
  }
};

module.exports = {
  authenticate,
  authorizeAdmin,
  authorizeRoles,
  optionalAuth,
  simpleAuth,
  createRateLimit,
  clearUserCache
};