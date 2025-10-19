const setupEnhancedSocketHandlers = (io) => {
  const roomManager = new Map();
  
  io.on('connection', (socket) => {
    console.log(`✅ Kullanıcı bağlandı: ${socket.user.username} (${socket.id})`);

    // WebRTC sinyalleme - Geliştirilmiş versiyon
    socket.on('webrtc_offer', async (data) => {
      try {
        const { target, sdp, roomId } = data;
        
        // Oda ve kullanıcı doğrulama
        const user = activeUsers.get(socket.id);
        if (!user || user.roomId !== roomId) {
          return socket.emit('error', { message: 'Geçersiz oda erişimi' });
        }

        console.log('📨 WebRTC offer gönderiliyor:', { from: socket.id, to: target });
        socket.to(target).emit('webrtc_offer', {
          sdp,
          sender: socket.id,
          roomId
        });

      } catch (error) {
        console.error('❌ WebRTC offer hatası:', error);
        socket.emit('error', { message: 'Ses bağlantısı kurulamadı' });
      }
    });

    socket.on('webrtc_answer', async (data) => {
      try {
        const { target, sdp, roomId } = data;
        
        const user = activeUsers.get(socket.id);
        if (!user || user.roomId !== roomId) {
          return socket.emit('error', { message: 'Geçersiz oda erişimi' });
        }

        console.log('📨 WebRTC answer gönderiliyor:', { from: socket.id, to: target });
        socket.to(target).emit('webrtc_answer', {
          sdp,
          sender: socket.id,
          roomId
        });

      } catch (error) {
        console.error('❌ WebRTC answer hatası:', error);
        socket.emit('error', { message: 'Ses bağlantısı kurulamadı' });
      }
    });

    socket.on('webrtc_ice_candidate', (data) => {
      try {
        const { target, candidate, roomId } = data;
        
        const user = activeUsers.get(socket.id);
        if (!user || user.roomId !== roomId) {
          return socket.emit('error', { message: 'Geçersiz oda erişimi' });
        }

        socket.to(target).emit('webrtc_ice_candidate', {
          candidate,
          sender: socket.id,
          roomId
        });

      } catch (error) {
        console.error('❌ ICE candidate hatası:', error);
      }
    });

    // Ses durumu güncellemeleri
    socket.on('audio_state_update', (data) => {
      const { roomId, isMuted, isSpeaking } = data;
      const user = activeUsers.get(socket.id);
      
      if (user && user.roomId === roomId) {
        socket.to(`room_${roomId}`).emit('user_audio_state_changed', {
          userId: user.userId,
          username: user.username,
          socketId: socket.id,
          isMuted,
          isSpeaking,
          timestamp: new Date().toISOString()
        });
      }
    });
  });
};