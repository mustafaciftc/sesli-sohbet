import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.eventListeners = new Map();
  }

  connect(token) {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        console.log('✅ Socket already connected');
        resolve();
        return;
      }

      try {
        const SOCKET_URL = 'http://localhost:5000';
        
        this.socket = io(SOCKET_URL, {
          auth: { token },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          timeout: 10000
        });

        // Bağlantı başarılı
        this.socket.once('connect', () => {
          console.log('✅ Socket connected:', this.socket.id);
          resolve();
        });

        // Bağlantı hatası
        this.socket.once('connect_error', (error) => {
          console.error('❌ Socket connection error:', error);
          reject(error);
        });

        // Event listeners
        this.socket.on('disconnect', (reason) => {
          console.log('❌ Socket disconnected:', reason);
        });

        this.socket.on('error', (error) => {
          console.error('❌ Socket error:', error);
        });

      } catch (error) {
        console.error('❌ Socket connection failed:', error);
        reject(error);
      }
    });
  }

  on(event, callback) {
    if (!this.socket) return;
    this.socket.on(event, callback);
    
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.socket) return;
    
    if (callback) {
      this.socket.off(event, callback);
      const listeners = this.eventListeners.get(event)?.filter(cb => cb !== callback);
      if (listeners) this.eventListeners.set(event, listeners);
    } else {
      this.socket.off(event);
      this.eventListeners.delete(event);
    }
  }

  emit(event, data) {
    if (!this.socket?.connected) {
      console.error('❌ Socket not connected for emit:', event);
      return false;
    }

    try {
      console.log('📤 Emitting event:', event, data);
      this.socket.emit(event, data);
      return true;
    } catch (error) {
      console.error('❌ Emit error:', error);
      return false;
    }
  }

  joinRoom(roomId) {
    return this.emit('join_room', { roomId: parseInt(roomId) });
  }

  leaveRoom(roomId) {
    return this.emit('leave_room', { roomId: parseInt(roomId) });
  }

  sendMessage(messageData) {
    return this.emit('send_message', messageData);
  }

  startSpeaking() {
    return this.emit('start_speaking');
  }

  stopSpeaking() {
    return this.emit('stop_speaking');
  }

  toggleMute(isMuted) {
    return this.emit('toggle_mute', { isMuted });
  }

  sendWebRTCOffer(target, offer) {
    return this.emit('webrtc_offer', { target, sdp: offer });
  }

  sendWebRTCAnswer(target, answer) {
    return this.emit('webrtc_answer', { target, sdp: answer });
  }

  sendWebRTCICECandidate(target, candidate) {
    return this.emit('webrtc_ice_candidate', { target, candidate });
  }

  setupWebRTCListeners(onOffer, onAnswer, onICECandidate) {
    this.on('webrtc_offer', onOffer);
    this.on('webrtc_answer', onAnswer);
    this.on('webrtc_ice_candidate', onICECandidate);
  }

  removeWebRTCListeners() {
    this.off('webrtc_offer');
    this.off('webrtc_answer');
    this.off('webrtc_ice_candidate');
  }

  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting socket...');
      
      this.eventListeners.forEach((listeners, event) => {
        listeners.forEach(callback => {
          this.socket.off(event, callback);
        });
      });
      this.eventListeners.clear();
      
      this.socket.disconnect();
      this.socket = null;
      console.log('✅ Socket disconnected');
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  getSocketId() {
    return this.socket?.id;
  }
}

const socketService = new SocketService();

// Global olarak erişilebilir yap
if (typeof window !== 'undefined') {
  window.socketService = socketService;
}

export default socketService;