const { query, transaction } = require('../db');

const getAllRooms = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const rooms = await query(
      `SELECT 
        r.id,
        r.name,
        r.description,
        r.max_participants,
        r.created_at,
        u.username as created_by_username,
        COUNT(DISTINCT rp.user_id) as current_participants
      FROM rooms r
      LEFT JOIN users u ON r.created_by = u.id
      LEFT JOIN room_participants rp ON r.id = rp.room_id AND rp.left_at IS NULL
      GROUP BY r.id
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const totalResult = await query('SELECT COUNT(*) as total FROM rooms');

    res.json({
      success: true,
      data: {
        rooms,
        pagination: {
          page,
          limit,
          total: totalResult[0].total,
          totalPages: Math.ceil(totalResult[0].total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Odaları Getirme Hatası:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Odalar alınamadı'
    });
  }
};

// Oda detayını getir
const getRoomById = async (req, res) => {
  try {
    const roomId = req.params.id;

    const rooms = await query(
      `SELECT 
        r.*,
        u.username as created_by_username
      FROM rooms r
      LEFT JOIN users u ON r.created_by = u.id
      WHERE r.id = ?`,
      [roomId]
    );

    if (rooms.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Oda bulunamadı'
      });
    }

    const room = rooms[0];

    const participants = await query(
      `SELECT 
        u.id,
        u.username,
        u.avatar_url,
        rp.joined_at,
        rp.is_speaking,
        rp.is_muted
      FROM room_participants rp
      JOIN users u ON rp.user_id = u.id
      WHERE rp.room_id = ? AND rp.left_at IS NULL
      ORDER BY rp.joined_at ASC`,
      [roomId]
    );

    res.json({
      success: true,
      data: {
        room: {
          ...room,
          current_participants: participants.length,
          participants
        }
      }
    });
  } catch (error) {
    console.error('Oda Detayı Getirme Hatası:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Oda detayları alınamadı'
    });
  }
};

// Oda oluştur
const createRoom = async (req, res) => {
  try {
    const { name, description, max_participants = 10 } = req.body;
    const createdBy = req.user.id;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Oda adı gereklidir'
      });
    }

    const result = await transaction(async (conn) => {
      // İsim kontrolü
      const existingRooms = await conn.query(
        'SELECT id FROM rooms WHERE name = ?',
        [name.trim()]
      );

      if (existingRooms.length > 0) {
        throw Object.assign(new Error('Bu isimde bir oda zaten mevcut'), { status: 400 });
      }

      // Oda oluştur
      const insertResult = await conn.query(
        `INSERT INTO rooms (name, description, max_participants, created_by) 
         VALUES (?, ?, ?, ?)`,
        [name.trim(), description ? description.trim() : null, max_participants, createdBy]
      );

      // Oluşturulan odayı getir
      const [newRoom] = await conn.query(
        `SELECT 
          r.*,
          u.username as created_by_username
        FROM rooms r
        LEFT JOIN users u ON r.created_by = u.id
        WHERE r.id = ?`,
        [insertResult.insertId]
      );

      return newRoom;
    });

    res.status(201).json({
      success: true,
      message: 'Oda başarıyla oluşturuldu',
      data: { room: result }
    });
  } catch (error) {
    console.error('Oda Oluşturma Hatası:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Oda oluşturulamadı'
    });
  }
};

// Oda güncelle
const updateRoom = async (req, res) => {
  try {
    const roomId = req.params.id;
    const { name, description, max_participants } = req.body;
    const userId = req.user.id;

    const existingRoom = await query(
      'SELECT id, created_by FROM rooms WHERE id = ?',
      [roomId]
    );

    if (existingRoom.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Oda bulunamadı'
      });
    }

    if (existingRoom[0].created_by !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu odayı güncelleme yetkiniz yok'
      });
    }

    const updates = [];
    const values = [];

    if (name !== undefined && name !== null) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Oda adı boş olamaz'
        });
      }
      updates.push('name = ?');
      values.push(name.trim());
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description ? description.trim() : null);
    }
    if (max_participants !== undefined) {
      updates.push('max_participants = ?');
      values.push(Math.max(2, Math.min(100, parseInt(max_participants) || 10)));
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Güncellenecek alan bulunamadı'
      });
    }

    const result = await transaction(async (conn) => {
      // İsim kontrolü
      if (name?.trim()) {
        const existingRooms = await conn.query(
          'SELECT id FROM rooms WHERE name = ? AND id != ?',
          [name.trim(), roomId]
        );
        if (existingRooms.length > 0) {
          throw Object.assign(new Error('Bu isimde bir oda zaten mevcut'), { status: 400 });
        }
      }

      // Odayı güncelle
      values.push(roomId);
      await conn.query(
        `UPDATE rooms SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values
      );

      // Güncellenen odayı getir
      const [updatedRoom] = await conn.query(
        `SELECT 
          r.id,
          r.name,
          r.description,
          r.max_participants,
          r.created_at,
          r.updated_at,
          u.username as created_by_username,
          COUNT(DISTINCT rp.user_id) as current_participants
        FROM rooms r
        LEFT JOIN users u ON r.created_by = u.id
        LEFT JOIN room_participants rp ON r.id = rp.room_id AND rp.left_at IS NULL
        WHERE r.id = ?
        GROUP BY r.id`,
        [roomId]
      );

      return updatedRoom;
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Güncellenen oda bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'Oda başarıyla güncellendi',
      data: { room: result }
    });
  } catch (error) {
    console.error('Oda Güncelleme Hatası:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Oda güncellenirken bir hata oluştu'
    });
  }
};

// Oda sil (HARD DELETE)
const deleteRoom = async (req, res) => {
  try {
    const roomId = req.params.id;
    const userId = req.user.id;

    const rooms = await query(
      'SELECT id, created_by FROM rooms WHERE id = ?',
      [roomId]
    );

    if (rooms.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Oda bulunamadı'
      });
    }

    if (rooms[0].created_by !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu odayı silme yetkiniz yok'
      });
    }

    await transaction(async (conn) => {
      // Önce bağımlı kayıtları temizle
      await conn.query(
        'UPDATE room_participants SET left_at = NOW() WHERE room_id = ? AND left_at IS NULL',
        [roomId]
      );
      
      await conn.query('DELETE FROM room_messages WHERE room_id = ?', [roomId]);
      await conn.query('DELETE FROM room_participants WHERE room_id = ?', [roomId]);
      
      // Odayı sil
      await conn.query('DELETE FROM rooms WHERE id = ?', [roomId]);
    });

    res.json({
      success: true,
      message: 'Oda başarıyla silindi'
    });
  } catch (error) {
    console.error('Oda Silme Hatası:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Oda silinemedi'
    });
  }
};

// Odaya katıl
const joinRoom = async (req, res) => {
  try {
    const roomId = req.params.id;
    const userId = req.user.id;

    const result = await transaction(async (conn) => {
      const rooms = await conn.query('SELECT * FROM rooms WHERE id = ?', [roomId]);

      if (rooms.length === 0) {
        throw new Error('Oda bulunamadı');
      }

      const room = rooms[0];

      const participantCount = await conn.query(
        'SELECT COUNT(*) as count FROM room_participants WHERE room_id = ? AND left_at IS NULL',
        [roomId]
      );

      if (participantCount[0].count >= room.max_participants) {
        throw new Error('Oda dolu');
      }

      const existingParticipant = await conn.query(
        'SELECT id FROM room_participants WHERE room_id = ? AND user_id = ? AND left_at IS NULL',
        [roomId, userId]
      );

      if (existingParticipant.length > 0) {
        return { room, alreadyJoined: true };
      }

      await conn.query(
        'INSERT INTO room_participants (room_id, user_id, is_speaking, is_muted) VALUES (?, ?, FALSE, TRUE)',
        [roomId, userId]
      );

      return { room, alreadyJoined: false };
    });

    res.json({
      success: true,
      message: result.alreadyJoined ? 'Zaten bu odadasınız' : 'Odaya başarıyla katıldınız',
      data: result
    });
  } catch (error) {
    console.error('Odaya Katılma Hatası:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Odaya katılamadı'
    });
  }
};

// Odadan ayrıl
const leaveRoom = async (req, res) => {
  try {
    const roomId = req.params.id;
    const userId = req.user.id;

    await transaction(async (conn) => {
      const result = await conn.query(
        'UPDATE room_participants SET left_at = NOW() WHERE room_id = ? AND user_id = ? AND left_at IS NULL',
        [roomId, userId]
      );

      if (result.affectedRows === 0) {
        throw new Error('Odada değilsiniz');
      }
    });

    res.json({
      success: true,
      message: 'Odadan ayrıldınız'
    });
  } catch (error) {
    console.error('Odadan Ayrılma Hatası:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Odadan ayrılamadı'
    });
  }
};

// Mesaj gönder
const sendMessage = async (req, res) => {
  try {
    const roomId = req.params.id;
    const userId = req.user.id;
    const { content, type = 'text' } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Mesaj içeriği gereklidir'
      });
    }

    const participant = await query(
      'SELECT id FROM room_participants WHERE room_id = ? AND user_id = ? AND left_at IS NULL',
      [roomId, userId]
    );

    if (participant.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Bu odada değilsiniz'
      });
    }

    const result = await query(
      `INSERT INTO room_messages (room_id, user_id, content, type) 
       VALUES (?, ?, ?, ?)`,
      [roomId, userId, content.trim(), type]
    );

    const messages = await query(
      `SELECT 
        rm.*,
        u.username,
        u.avatar_url
      FROM room_messages rm
      JOIN users u ON rm.user_id = u.id
      WHERE rm.id = ?`,
      [result.insertId]
    );

    res.json({
      success: true,
      message: 'Mesaj gönderildi',
      data: { message: messages[0] }
    });
  } catch (error) {
    console.error('Mesaj Gönderme Hatası:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Mesaj gönderilemedi'
    });
  }
};

// Oda mesajlarını getir
const getRoomMessages = async (req, res) => {
  try {
    const roomId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const messages = await query(
      `SELECT 
        rm.*,
        u.username,
        u.avatar_url
      FROM room_messages rm
      JOIN users u ON rm.user_id = u.id
      WHERE rm.room_id = ?
      ORDER BY rm.created_at DESC
      LIMIT ? OFFSET ?`,
      [roomId, limit, offset]
    );

    const totalResult = await query(
      'SELECT COUNT(*) as total FROM room_messages WHERE room_id = ?',
      [roomId]
    );

    res.json({
      success: true,
      data: {
        messages: messages.reverse(),
        pagination: {
          page,
          limit,
          total: totalResult[0].total,
          totalPages: Math.ceil(totalResult[0].total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Mesajları Getirme Hatası:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Mesajlar alınamadı'
    });
  }
};

module.exports = {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  joinRoom,
  leaveRoom,
  sendMessage,
  getRoomMessages
};