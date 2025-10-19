const bcrypt = require('bcrypt');
const { query } = require('../db');
const { generateToken, decodeTokenSafe } = require('../utils/jwt');

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validateUsername = (username) => /^[a-zA-Z0-9_]{3,20}$/.test(username);
const validatePassword = (password) => password.length >= 6 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password);

const sendError = (res, statusCode, message) => res.status(statusCode).json({ success: false, message });
const sendSuccess = (res, statusCode, message, data = null) => {
  const response = { success: true, message };
  if (data) response.data = data;
  return res.status(statusCode).json(response);
};

const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!validateEmail(email) || !validateUsername(username) || !validatePassword(password)) {
      return sendError(res, 400, 'Geçersiz giriş bilgileri');
    }

    const existingUsers = await query(
      'SELECT id, email, username FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existingUsers.find(u => u.email === email)) {
      return sendError(res, 400, 'Bu email adresi zaten kullanımda');
    }
    if (existingUsers.find(u => u.username === username)) {
      return sendError(res, 400, 'Bu kullanıcı adı zaten alınmış');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO users (username, email, password_hash, role, is_active, created_at) 
       VALUES (?, ?, ?, 'user', TRUE, NOW())`,
      [username, email, passwordHash]
    );

    const userId = result.insertId;
    const token = generateToken(userId, 'user');

    const [userData] = await query(
      `SELECT id, username, email, role, avatar_url, created_at, last_login 
       FROM users WHERE id = ?`,
      [userId]
    );

    return sendSuccess(res, 201, 'Kayıt işlemi başarılı', { token, user: userData });
  } catch (error) {
    console.error('Register Error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return sendError(res, 400, 'Email veya kullanıcı adı zaten mevcut');
    }
    return sendError(res, 500, error.message || 'Kayıt işlemi başarısız');
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!validateEmail(email)) {
      return sendError(res, 400, 'Geçersiz email formatı');
    }

    const users = await query(
      `SELECT id, username, email, password_hash, role, is_active, avatar_url, created_at, last_login
       FROM users WHERE email = ?`,
      [email]
    );

    if (users.length === 0 || !(await bcrypt.compare(password, users[0].password_hash))) {
      return sendError(res, 401, 'Email veya şifre hatalı');
    }

    const user = users[0];
    if (!user.is_active) {
      return sendError(res, 403, 'Hesabınız devre dışı bırakılmış');
    }

    await query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
    const token = generateToken(user.id, user.role);

    return sendSuccess(res, 200, 'Giriş başarılı', {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
        last_login: user.last_login
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    return sendError(res, 500, error.message || 'Giriş işlemi başarısız');
  }
};

const guestLogin = async (req, res) => {
  try {
    const { username } = req.body;
    
    const guestUsername = username || `Misafir${Math.floor(1000 + Math.random() * 9000)}`;
    const guestEmail = `guest-${Date.now()}@temp.com`;
    const guestPasswordHash = `guest_hash_${Date.now()}`;
    
    console.log('🔧 Guest login attempt:', { guestUsername });

    const lastUser = await query('SELECT id FROM users ORDER BY id DESC LIMIT 1');
    const lastId = lastUser[0] ? lastUser[0].id : 0;
    console.log('🔍 Last user ID:', lastId);

    const result = await query(
      `INSERT INTO users (username, email, password_hash, role, is_active, created_at) 
       VALUES (?, ?, ?, 'guest', TRUE, NOW())`,
      [guestUsername, guestEmail, guestPasswordHash]
    );

    console.log('🔍 Raw database result:', result);

    const newUser = await query('SELECT id FROM users WHERE username = ? ORDER BY id DESC LIMIT 1', [guestUsername]);
    
    if (newUser.length === 0) {
      throw new Error('Kullanıcı oluşturuldu ama bulunamadı');
    }

    const userId = newUser[0].id;
    console.log('✅ Found user ID:', userId);

    const token = generateToken(userId, 'guest');
    
    res.status(201).json({
      success: true,
      message: 'Misafir girişi başarılı',
      data: {
        token,
        user: {
          id: userId,
          username: guestUsername,
          role: 'guest',
          isGuest: true
        }
      }
    });

  } catch (error) {
    console.error('❌ Guest login error:', error);
    res.status(500).json({
      success: false,
      message: 'Misafir girişi başarısız: ' + error.message
    });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const [user] = await query(
      `SELECT id, username, email, role, avatar_url, created_at, last_login 
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (!user) {
      return sendError(res, 404, 'Kullanıcı bulunamadı');
    }

    return sendSuccess(res, 200, 'Kullanıcı bilgileri alındı', { user });
  } catch (error) {
    console.error('Get Current User Error:', error);
    return sendError(res, 500, error.message || 'Kullanıcı bilgileri alınamadı');
  }
};

const updateProfile = async (req, res) => {
  try {
    const { username, avatar_url } = req.body;
    const userId = req.user.id;

    if (!username && avatar_url === undefined) {
      return sendError(res, 400, 'Güncellenecek alan bulunamadı');
    }

    if (username && !validateUsername(username)) {
      return sendError(res, 400, 'Geçersiz kullanıcı adı');
    }

    if (username) {
      const existingUser = await query(
        'SELECT id FROM users WHERE username = ? AND id != ?',
        [username, userId]
      );

      if (existingUser.length > 0) {
        return sendError(res, 400, 'Bu kullanıcı adı zaten kullanımda');
      }
    }

    const updates = [];
    const values = [];

    if (username) {
      updates.push('username = ?');
      values.push(username);
    }
    if (avatar_url !== undefined) {
      updates.push('avatar_url = ?');
      values.push(avatar_url);
    }
    updates.push('updated_at = NOW()');
    values.push(userId);

    await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    const [updatedUser] = await query(
      `SELECT id, username, email, role, avatar_url, created_at, last_login 
       FROM users WHERE id = ?`,
      [userId]
    );

    return sendSuccess(res, 200, 'Profil güncellendi', { user: updatedUser });
  } catch (error) {
    console.error('Update Profile Error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return sendError(res, 400, 'Kullanıcı adı zaten kullanımda');
    }
    return sendError(res, 500, error.message || 'Profil güncellenemedi');
  }
};

const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    const queryParams = search ? [`%${search}%`, `%${search}%`, parseInt(limit), offset] : [parseInt(limit), offset];
    const whereClause = search ? 'WHERE username LIKE ? OR email LIKE ?' : '';

    const users = await query(
      `SELECT id, username, email, role, is_active, avatar_url, created_at, last_login
       FROM users 
       ${whereClause}
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      queryParams
    );

    const countResult = await query(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      search ? [`%${search}%`, `%${search}%`] : []
    );

    return sendSuccess(res, 200, 'Kullanıcılar listelendi', {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Get Users Error:', error);
    return sendError(res, 500, error.message || 'Kullanıcılar listelenemedi');
  }
};

module.exports = {
  register,
  login,
  guestLogin,
  getCurrentUser,
  updateProfile,
  getUsers
};