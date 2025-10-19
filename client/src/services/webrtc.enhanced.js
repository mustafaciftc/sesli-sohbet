class EnhancedWebRTCService {
  constructor() {
    this.peerConnections = new Map();
    this.localStream = null;
    this.audioElements = new Map();
    this.connectionStats = new Map();
    this.isInitialized = false;
    
    this.iceServers = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10
    };
    
    this.audioConstraints = {
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        latency: 0,
        sampleRate: 48000,
        sampleSize: 16,
        volume: 1.0
      },
      video: false
    };
  }

  // Gelişmiş bağlantı yönetimi
  async createEnhancedPeerConnection(socketId, userId) {
    try {
      if (this.peerConnections.has(socketId)) {
        console.log('✅ Mevcut peer connection kullanılıyor:', socketId);
        return this.peerConnections.get(socketId);
      }

      const peerConnection = new RTCPeerConnection(this.iceServers);

      // Connection state monitoring
      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        console.log(`🔗 Peer connection state (${socketId}):`, state);
        
        this.connectionStats.set(socketId, {
          state,
          lastStateChange: new Date(),
          userId
        });

        // Bağlantı sorunlarını yönet
        if (state === 'failed' || state === 'disconnected') {
          this.handleConnectionIssue(socketId, state);
        }
      };

      // ICE connection state
      peerConnection.oniceconnectionstatechange = () => {
        console.log(`🧊 ICE connection state (${socketId}):`, peerConnection.iceConnectionState);
      };

      // ICE candidate handling
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('📨 ICE candidate gönderiliyor:', socketId);
          // Socket üzerinden candidate gönder
          if (window.socketService) {
            window.socketService.sendWebRTCICECandidate(socketId, event.candidate);
          }
        }
      };

      // Remote stream handling
      peerConnection.ontrack = (event) => {
        console.log('📥 Remote stream alındı:', socketId);
        if (event.streams && event.streams[0]) {
          this.handleRemoteStream(socketId, event.streams[0]);
        }
      };

      // Local stream ekleme
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, this.localStream);
        });
        console.log('✅ Local stream peer connectiona eklendi');
      }

      this.peerConnections.set(socketId, peerConnection);
      return peerConnection;

    } catch (error) {
      console.error('❌ Peer connection oluşturma hatası:', error);
      throw new Error(`Peer connection oluşturulamadı: ${error.message}`);
    }
  }

  // Bağlantı sorunlarını yönet
  handleConnectionIssue(socketId, state) {
    console.warn(`⚠️ Bağlantı sorunu: ${socketId} - ${state}`);
    
    // 5 saniye sonra reconnect dene
    setTimeout(() => {
      const pc = this.peerConnections.get(socketId);
      if (pc && (pc.connectionState === 'failed' || pc.connectionState === 'disconnected')) {
        console.log('🔄 Bağlantı yeniden deneniyor:', socketId);
        this.cleanupAudioElement(socketId);
        this.peerConnections.delete(socketId);
      }
    }, 5000);
  }

  // Ses kalitesi monitoring
  startAudioQualityMonitoring() {
    setInterval(() => {
      this.peerConnections.forEach((pc, socketId) => {
        if (pc.connectionState === 'connected') {
          this.getConnectionStats(pc, socketId);
        }
      });
    }, 10000); // Her 10 saniyede bir
  }

  async getConnectionStats(pc, socketId) {
    try {
      const stats = await pc.getStats();
      let audioStats = {
        packetsLost: 0,
        packetsReceived: 0,
        jitter: 0,
        latency: 0
      };

      stats.forEach(report => {
        if (report.type === 'inbound-rtp' && report.kind === 'audio') {
          audioStats.packetsLost += report.packetsLost || 0;
          audioStats.packetsReceived += report.packetsReceived || 0;
          audioStats.jitter = report.jitter || 0;
        }
      });

      // Kalite kontrolü
      const packetLoss = audioStats.packetsReceived > 0 ? 
        (audioStats.packetsLost / audioStats.packetsReceived) * 100 : 0;

      if (packetLoss > 10) {
        console.warn(`🎧 Yüksek paket kaybı: ${socketId} - %${packetLoss.toFixed(2)}`);
      }

      this.connectionStats.set(socketId, {
        ...this.connectionStats.get(socketId),
        audioStats,
        packetLoss,
        lastUpdate: new Date()
      });

    } catch (error) {
      console.error('Ses istatistikleri alınamadı:', error);
    }
  }
}

export default new EnhancedWebRTCService();