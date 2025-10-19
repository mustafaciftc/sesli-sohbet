class WebRTCService {
  constructor() {
    this.peerConnections = new Map();
    this.localStream = null;
    this.audioElements = new Map();
    this.isInitialized = false;
    this.isMicrophoneEnabled = false;

    this.iceServers = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
  }

  async initialize() {
    if (this.isInitialized) {
      return this.localStream;
    }

    try {
      console.log('🎤 Initializing microphone...');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tarayıcınız mikrofon erişimini desteklemiyor');
      }

      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000
        },
        video: false
      });

      this.isInitialized = true;
      this.isMicrophoneEnabled = true;

      console.log('✅ Microphone initialized successfully');
      return this.localStream;

    } catch (error) {
      console.error('❌ Microphone initialization failed:', error);
      
      this.isInitialized = true;
      this.isMicrophoneEnabled = false;
      
      let errorMessage = 'Mikrofon erişimi sağlanamadı. ';
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Lütfen mikrofon izinlerini kontrol edin.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'Mikrofon bulunamadı.';
      } else {
        errorMessage += 'Sadece mesajlaşma özelliği kullanılabilir.';
      }
      
      throw new Error(errorMessage);
    }
  }

  setMicrophoneMuted(isMuted) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
      this.isMicrophoneEnabled = !isMuted;
      console.log(`🎤 Microphone ${isMuted ? 'muted' : 'unmuted'}`);
    }
  }

  async getLocalStream() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.localStream;
  }

  createPeerConnection(socketId) {
    try {
      if (this.peerConnections.has(socketId)) {
        return this.peerConnections.get(socketId);
      }

      const peerConnection = new RTCPeerConnection(this.iceServers);

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          // ICE candidate gönder
        }
      };

      peerConnection.ontrack = (event) => {
        console.log('📥 Received remote stream from', socketId);
        if (event.streams && event.streams[0]) {
          this.handleRemoteStream(socketId, event.streams[0]);
        }
      };

      peerConnection.onconnectionstatechange = () => {
        console.log(`Peer connection state for ${socketId}:`, peerConnection.connectionState);
      };

      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, this.localStream);
        });
      }

      this.peerConnections.set(socketId, peerConnection);
      console.log(`✅ Peer connection created for ${socketId}`);
      return peerConnection;

    } catch (error) {
      console.error('Error creating peer connection:', error);
      return null;
    }
  }

  handleRemoteStream(socketId, stream) {
    try {
      let audioElement = this.audioElements.get(socketId);
      
      if (!audioElement) {
        audioElement = document.createElement('audio');
        audioElement.autoplay = true;
        audioElement.playsInline = true;
        audioElement.volume = 0.8;
        audioElement.style.display = 'none';
        audioElement.setAttribute('data-socket-id', socketId);
        document.body.appendChild(audioElement);
        this.audioElements.set(socketId, audioElement);
      }

      audioElement.srcObject = stream;
      console.log(`🔊 Remote audio setup for ${socketId}`);

    } catch (error) {
      console.error('Error handling remote stream:', error);
    }
  }

  async createOffer(socketId) {
    try {
      const peerConnection = this.createPeerConnection(socketId);
      if (!peerConnection) {
        throw new Error('Peer connection oluşturulamadı');
      }

      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      
      await peerConnection.setLocalDescription(offer);
      return offer;
    } catch (error) {
      console.error('Error creating offer:', error);
      throw error;
    }
  }

  async handleOffer(socketId, offer) {
    try {
      console.log('📥 Received offer from', socketId);
      const peerConnection = this.createPeerConnection(socketId);
      if (!peerConnection) {
        throw new Error('Peer connection oluşturulamadı');
      }

      await peerConnection.setRemoteDescription(offer);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      return answer;
    } catch (error) {
      console.error('Error handling offer:', error);
      throw error;
    }
  }

  async handleAnswer(socketId, answer) {
    try {
      console.log('📥 Received answer from', socketId);
      const peerConnection = this.peerConnections.get(socketId);
      if (!peerConnection) {
        throw new Error('Peer connection bulunamadı');
      }

      await peerConnection.setRemoteDescription(answer);
      console.log('✅ Answer handled successfully');
    } catch (error) {
      console.error('Error handling answer:', error);
      throw error;
    }
  }

  async handleICECandidate(socketId, candidate) {
    try {
      console.log('📥 Received ICE candidate from', socketId);
      const peerConnection = this.peerConnections.get(socketId);
      if (!peerConnection) {
        console.warn('Peer connection not found for ICE candidate');
        return;
      }

      await peerConnection.addIceCandidate(candidate);
      console.log('✅ ICE candidate added');
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }

  cleanup() {
    console.log('🧹 Cleaning up WebRTC service...');
    
    this.peerConnections.forEach((pc, socketId) => {
      pc.close();
      this.cleanupAudioElement(socketId);
    });
    this.peerConnections.clear();

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    this.isInitialized = false;
    this.isMicrophoneEnabled = false;
    console.log('✅ WebRTC service cleaned up');
  }

  cleanupAudioElement(socketId) {
    const audioElement = this.audioElements.get(socketId);
    if (audioElement) {
      audioElement.srcObject = null;
      if (audioElement.parentNode) {
        audioElement.parentNode.removeChild(audioElement);
      }
      this.audioElements.delete(socketId);
    }
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isMicrophoneEnabled: this.isMicrophoneEnabled,
      peerConnections: this.peerConnections.size,
      hasLocalStream: !!this.localStream
    };
  }
}

const webrtcService = new WebRTCService();
export default webrtcService;