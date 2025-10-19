import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  resetVoiceState, 
  setMicrophoneEnabled, 
  setMuted,
  setPushToTalkActive,
  setConnected
} from '../features/voice/voiceSlice';
import socketService from '../services/socket.service';
import webrtcService from '../services/webrtc.service';
import { toast } from 'react-toastify';

const useVoiceRoom = ({ roomId, navigate }) => {
  const dispatch = useDispatch();
  
  const token = useSelector(state => state.auth.token); 
  const { isMuted, isMicrophoneEnabled, isConnected, isPushToTalkActive } = useSelector(state => state.voice);
  
  const [isInitializing, setIsInitializing] = useState(true);
  const [initializationError, setInitializationError] = useState(null);
  
  const timeoutRef = useRef(null);
  const cleanupCalledRef = useRef(false);
  const removeWebRTCListenersRef = useRef(() => {});
  const initializationAttemptedRef = useRef(false);

  // WebRTC Event Handlers
  const handleWebRTCOffer = useCallback(async (data) => {
    try {
      console.log('📥 Received WebRTC offer from:', data.from);
      const answer = await webrtcService.handleOffer(data.from, data.sdp);
      socketService.sendWebRTCAnswer(data.from, answer);
    } catch (error) {
      console.error('Error handling WebRTC offer:', error);
    }
  }, []);

  const handleWebRTCAnswer = useCallback(async (data) => {
    try {
      console.log('📥 Received WebRTC answer from:', data.from);
      await webrtcService.handleAnswer(data.from, data.sdp);
    } catch (error) {
      console.error('Error handling WebRTC answer:', error);
    }
  }, []);

  const handleWebRTCICECandidate = useCallback(async (data) => {
    try {
      await webrtcService.handleICECandidate(data.from, data.candidate);
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }, []);

  // Socket Event Handlers
  const handleUserJoined = useCallback((data) => {
    console.log('👤 User joined:', data.userId);
  }, []);

  const handleUserLeft = useCallback((data) => {
    console.log('👤 User left:', data.userId);
    webrtcService.cleanupAudioElement(data.userId);
  }, []);

  const handleUserMuted = useCallback((data) => {
    console.log('🔇 User muted:', data.userId, data.isMuted);
  }, []);

  const handleUserStartedSpeaking = useCallback((data) => {
    console.log('🎤 User started speaking:', data.userId);
  }, []);

  const handleUserStoppedSpeaking = useCallback((data) => {
    console.log('🔇 User stopped speaking:', data.userId);
  }, []);

  // Push-to-talk functions
  const handlePushToTalkEnd = useCallback(() => {
    if (isPushToTalkActive) {
      dispatch(setPushToTalkActive(false));
      socketService.stopSpeaking();
      webrtcService.setMicrophoneMuted(true);
    }
  }, [isPushToTalkActive, dispatch]);

  const handlePushToTalkStart = useCallback(() => {
    if (!isMuted && isMicrophoneEnabled && isConnected) {
      dispatch(setPushToTalkActive(true));
      socketService.startSpeaking();
      webrtcService.setMicrophoneMuted(false);
    }
  }, [isMuted, isMicrophoneEnabled, isConnected, dispatch]);

  // Microphone setup
  const setupMicrophone = useCallback(async () => {
    try {
      console.log('🎤 Setting up microphone...');
      await webrtcService.getLocalStream();
      dispatch(setMicrophoneEnabled(true));
      webrtcService.setMicrophoneMuted(true);
      console.log('✅ Microphone setup completed');
    } catch (error) {
      console.error('❌ Microphone setup failed:', error);
      throw new Error(error.message || 'Mikrofon erişimi reddedildi. Lütfen izinleri kontrol edin.');
    }
  }, [dispatch]);

  // WebRTC listeners setup
  const setupWebRTCListeners = useCallback(() => {
    console.log('🔧 Setting up WebRTC listeners...');
    
    socketService.setupWebRTCListeners(
      handleWebRTCOffer,
      handleWebRTCAnswer,
      handleWebRTCICECandidate
    );

    // Additional socket listeners
    socketService.on('user_joined', handleUserJoined);
    socketService.on('user_left', handleUserLeft);
    socketService.on('user_muted', handleUserMuted);
    socketService.on('user_started_speaking', handleUserStartedSpeaking);
    socketService.on('user_stopped_speaking', handleUserStoppedSpeaking);

    return () => {
      console.log('🧹 Removing WebRTC listeners...');
      socketService.removeWebRTCListeners();
      socketService.off('user_joined', handleUserJoined);
      socketService.off('user_left', handleUserLeft);
      socketService.off('user_muted', handleUserMuted);
      socketService.off('user_started_speaking', handleUserStartedSpeaking);
      socketService.off('user_stopped_speaking', handleUserStoppedSpeaking);
    };
  }, [
    handleWebRTCOffer, 
    handleWebRTCAnswer, 
    handleWebRTCICECandidate, 
    handleUserJoined, 
    handleUserLeft, 
    handleUserMuted,
    handleUserStartedSpeaking,
    handleUserStoppedSpeaking
  ]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (cleanupCalledRef.current) {
      console.log('⚠️ Cleanup already called, skipping...');
      return;
    }
    cleanupCalledRef.current = true;

    console.log('🧹 Cleaning up voice room...');
    
    // Clear timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Handle push-to-talk state
    if (isPushToTalkActive) {
      handlePushToTalkEnd();
    }

    // Leave room and cleanup services
    try {
      if (socketService.isConnected()) {
        socketService.leaveRoom(roomId);
      } else {
        console.log('ℹ️ Socket not connected, skipping leave_room');
      }
    } catch (error) {
      console.warn('Error leaving room:', error);
    }

    webrtcService.cleanup();
    removeWebRTCListenersRef.current();
    
    dispatch(resetVoiceState());
    console.log('✅ Voice room cleanup completed');
  }, [roomId, isPushToTalkActive, handlePushToTalkEnd, dispatch]);

  // Room initialization
  const initializeRoom = useCallback(async () => {
    // ÖNEMLİ: roomId kontrolü
    if (!roomId) {
      console.error('❌ initializeRoom: roomId is required but got:', roomId);
      setInitializationError('Oda bulunamadı. Lütfen tekrar deneyin.');
      setIsInitializing(false);
      
      timeoutRef.current = setTimeout(() => {
        navigate('/rooms');
      }, 2000);
      return;
    }

    if (cleanupCalledRef.current) {
      console.log('⚠️ Cleanup already called, skipping initialization');
      return;
    }

    if (initializationAttemptedRef.current) {
      console.log('⚠️ Initialization already attempted, skipping');
      return;
    }
    initializationAttemptedRef.current = true;

    try {
      console.log('🚀 Initializing voice room...', { 
        roomId, 
        hasToken: !!token,
        roomIdType: typeof roomId
      });
      
      setIsInitializing(true);
      setInitializationError(null);
      cleanupCalledRef.current = false;

      // Token kontrolü
      if (!token) {
        throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
      }

      // Connect socket if not connected
      if (!socketService.isConnected()) {
        console.log('🔌 Connecting socket...');
        await socketService.connect(token);
        dispatch(setConnected(true));
        console.log('✅ Socket connected successfully');
      } else {
        console.log('✅ Socket already connected');
      }

      // Join room via socket
      console.log(`🎯 Joining room ${roomId} via socket...`);
      const joinSuccess = socketService.joinRoom(roomId);
      if (!joinSuccess) {
        throw new Error('Socket sunucuya katılamadı.');
      }

      console.log('✅ Successfully joined room via socket');

      // Setup microphone and listeners
      await setupMicrophone();
      removeWebRTCListenersRef.current = setupWebRTCListeners();

      setIsInitializing(false);
      console.log('✅ Voice room initialization completed');
      toast.success('Sesli odaya katıldınız! 🎉');

    } catch (error) {
      console.error('❌ Room initialization error:', error);
      
      const errorMessage = error.message || 'Bilinmeyen bir hata oluştu.';
      setInitializationError(errorMessage);
      
      toast.error(`Sesli odaya katılamadı: ${errorMessage}`);
      
      // Navigate back after error
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        console.log('🔄 Navigating back to rooms due to error');
        navigate('/rooms');
      }, 3000);
    }
  }, [
    roomId, 
    token, 
    dispatch, 
    navigate, 
    setupMicrophone, 
    setupWebRTCListeners
  ]);

  // Mute toggle function
  const toggleMute = useCallback(() => {
    const newMutedState = !isMuted;
    
    dispatch(setMuted(newMutedState));
    socketService.toggleMute(newMutedState);
    
    if (newMutedState && isPushToTalkActive) {
      handlePushToTalkEnd();
    }
    
    toast.info(newMutedState ? '🔇 Mikrofon kapatıldı' : '🎤 Mikrofon açıldı');
  }, [isMuted, isPushToTalkActive, dispatch, handlePushToTalkEnd]);

  // Derived state
  const derivedState = useMemo(() => ({
    canSpeak: !isMuted && isMicrophoneEnabled && isConnected,
    roomReady: !isInitializing && !initializationError
  }), [isMuted, isMicrophoneEnabled, isConnected, isInitializing, initializationError]);

  // Main useEffect
  useEffect(() => {
    console.log('🎯 useVoiceRoom useEffect triggered', { roomId });

    if (!roomId) {
      console.error('❌ useVoiceRoom: roomId is undefined or null');
      setInitializationError('Oda bulunamadı');
      setIsInitializing(false);
      return;
    }

    initializeRoom();

    return () => {
      console.log('🔄 useVoiceRoom cleanup triggered');
      cleanup();
    };
  }, [roomId, initializeRoom, cleanup]);

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🔚 Component unmounting, cleaning up...');
      if (!cleanupCalledRef.current) {
        cleanup();
      }
    };
  }, [cleanup]);

  return {
    // State
    isInitializing,
    initializationError,
    
    // Functions
    handlePushToTalkStart,
    handlePushToTalkEnd,
    toggleMute,
    cleanup,
    
    // Derived state
    ...derivedState,
    
    // Voice state
    isMuted,
    isMicrophoneEnabled,
    isConnected,
    isPushToTalkActive
  };
};

export default useVoiceRoom;