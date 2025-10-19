// socketHandlers.js - FIXED VERSION
const { query } = require('./db');

const setupSocketHandlers = (io) => {
  const activeRooms = new Map();
  const activeUsers = new Map();

  const updateRoomStatus = async (roomId) => {
    try {
      const roomParticipants = Array.from(activeUsers.values())
        .filter(user => user.roomId === roomId)
        .length;
      
      io.to(`room_${roomId}`).emit('room_status_update', {
        roomId,
        participantCount: roomParticipants,
        timestamp: new Date().toISOString()
      });
      
      console.log(`🔄 Oda ${roomId} durumu güncellendi: ${roomParticipants} katılımcı`);
    } catch (error) {
      console.error('Oda durumu güncelleme hatası:', error);
    }
  };

  io.on('connection', (socket) => {
    console.log(`✅ Kullanıcı bağlandı: ${socket.user.username} (${socket.id})`);

    // FIXED: Mesaj gönderme - Hemen broadcast et
    socket.on('send_message', async (data) => {
      try {
        const { roomId, content, type = 'text' } = data;
        const user = activeUsers.get(socket.id);

        if (!user) {
          console.log('❌ Kullanıcı aktif değil:', socket.id);
          socket.emit('error', { message: 'Önce odaya katılmalısınız' });
          return;
        }

        console.log('📨 Mesaj alındı:', { roomId, content, type, from: user.username });

        // Veritabanına kaydet
        const result = await query(
          `INSERT INTO room_messages (room_id, user_id, content, type) 
           VALUES (?, ?, ?, ?)`,
          [roomId, user.userId, content, type]
        );

        const messageData = {
          id: result.insertId,
          userId: user.userId,
          username: user.username,
          content,
          type,
          timestamp: new Date().toISOString()
        };

        // Hemen tüm odaya broadcast et (gönderen dahil)
        io.to(`room_${roomId}`).emit('new_message', messageData);
        
        console.log('✅ Mesaj gönderildi:', messageData);

      } catch (error) {
        console.error('❌ Mesaj gönderme hatası:', error);
        socket.emit('error', { message: 'Mesaj gönderilemedi' });
      }
    });

    socket.on('join_room', async (data) => {
      try {
        const { roomId } = data;
        const userId = socket.user.id;
        const username = socket.user.username;

        console.log(`👤 ${username} odaya katılıyor: ${roomId}`);

        // Önceki odadan ayrıl
        const currentUser = activeUsers.get(socket.id);
        if (currentUser && currentUser.roomId) {
          socket.leave(`room_${currentUser.roomId}`);
          socket.to(`room_${currentUser.roomId}`).emit('user_left', {
            userId: currentUser.userId,
            username: currentUser.username,
            socketId: socket.id
          });
          await updateRoomStatus(currentUser.roomId);
        }

        // Yeni odaya katıl
        socket.join(`room_${roomId}`);

        const userData = {
          userId,
          username,
          roomId,
          isSpeaking: false,
          isMuted: false,
          joinedAt: new Date().toISOString()
        };

        activeUsers.set(socket.id, userData);

        // Diğer kullanıcılara bildir
        socket.to(`room_${roomId}`).emit('user_joined', {
          userId,
          username,
          socketId: socket.id,
          isMuted: false
        });

        // Mevcut kullanıcıları gönder
        const roomUsers = [];
        for (const [socketId, user] of activeUsers.entries()) {
          if (user.roomId === roomId && socketId !== socket.id) {
            roomUsers.push({
              userId: user.userId,
              username: user.username,
              socketId,
              isSpeaking: user.isSpeaking,
              isMuted: user.isMuted
            });
          }
        }

        socket.emit('room_users', roomUsers);
        await updateRoomStatus(roomId);
        
        console.log(`✅ ${username} odaya katıldı: ${roomId}`);
      } catch (error) {
        console.error('❌ Odaya Katılma Hatası:', error);
        socket.emit('error', { message: 'Odaya katılamadı.' });
      }
    });

    socket.on('leave_room', async (data) => {
      try {
        const { roomId } = data;
        const user = activeUsers.get(socket.id);

        if (user) {
          socket.to(`room_${roomId}`).emit('user_left', {
            userId: user.userId,
            username: user.username,
            socketId: socket.id
          });

          socket.leave(`room_${roomId}`);
          activeUsers.delete(socket.id);
          await updateRoomStatus(roomId);
          console.log(`👋 ${user.username} odadan ayrıldı: ${roomId}`);
        }
      } catch (error) {
        console.error('❌ Odadan Ayrılma Hatası:', error);
      }
    });

    // FIXED: Konuşma durumu - Tüm odaya broadcast
    socket.on('start_speaking', () => {
      try {
        const user = activeUsers.get(socket.id);
        if (user && !user.isMuted) {
          user.isSpeaking = true;
          activeUsers.set(socket.id, user);
          
          // Tüm odaya broadcast (kendisi dahil)
          io.to(`room_${user.roomId}`).emit('user_speaking', {
            userId: user.userId,
            username: user.username,
            socketId: socket.id,
            isSpeaking: true
          });
          
          console.log(`🎤 ${user.username} konuşmaya başladı`);
        }
      } catch (error) {
        console.error('❌ Konuşma Başlatma Hatası:', error);
      }
    });

    socket.on('stop_speaking', () => {
      try {
        const user = activeUsers.get(socket.id);
        if (user) {
          user.isSpeaking = false;
          activeUsers.set(socket.id, user);
          
          // Tüm odaya broadcast (kendisi dahil)
          io.to(`room_${user.roomId}`).emit('user_speaking', {
            userId: user.userId,
            username: user.username,
            socketId: socket.id,
            isSpeaking: false
          });
          
          console.log(`🔇 ${user.username} konuşmayı bitirdi`);
        }
      } catch (error) {
        console.error('❌ Konuşma Durdurma Hatası:', error);
      }
    });

    socket.on('toggle_mute', (data) => {
      try {
        const { isMuted } = data;
        const user = activeUsers.get(socket.id);
        if (user) {
          user.isMuted = isMuted;
          if (isMuted) user.isSpeaking = false;
          activeUsers.set(socket.id, user);
          
          socket.to(`room_${user.roomId}`).emit('user_muted', {
            userId: user.userId,
            username: user.username,
            socketId: socket.id,
            isMuted
          });
          
          console.log(`🔇 ${user.username} ${isMuted ? 'susturuldu' : 'susturma kaldırıldı'}`);
        }
      } catch (error) {
        console.error('❌ Susturma Değiştirme Hatası:', error);
      }
    });

    // WebRTC signaling
    socket.on('webrtc_offer', (data) => {
      socket.to(data.target).emit('webrtc_offer', {
        sdp: data.sdp,
        sender: socket.id
      });
    });

    socket.on('webrtc_answer', (data) => {
      socket.to(data.target).emit('webrtc_answer', {
        sdp: data.sdp,
        sender: socket.id
      });
    });

    socket.on('webrtc_ice_candidate', (data) => {
      socket.to(data.target).emit('webrtc_ice_candidate', {
        candidate: data.candidate,
        sender: socket.id
      });
    });

    socket.on('disconnect', async () => {
      try {
        const user = activeUsers.get(socket.id);
        if (user) {
          socket.to(`room_${user.roomId}`).emit('user_left', {
            userId: user.userId,
            username: user.username,
            socketId: socket.id
          });
          activeUsers.delete(socket.id);
          await updateRoomStatus(user.roomId);
          console.log(`❌ ${user.username} bağlantısı kesildi`);
        }
      } catch (error) {
        console.error('❌ Bağlantı Kesme Hatası:', error);
      }
    });
  });
};

module.exports = setupSocketHandlers;