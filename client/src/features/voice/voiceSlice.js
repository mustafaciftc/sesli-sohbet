import { createSlice, createSelector } from '@reduxjs/toolkit';

const STALE_TIMEOUT = 10000;
const INITIAL_CONNECTION_STATS = {
  total: 0, connected: 0, connecting: 0, failed: 0, disconnected: 0
};
const INITIAL_CONNECTION_QUALITY = {
  overall: 'unknown', audioLatency: 0, packetLoss: 0, jitter: 0
};
const INITIAL_LOADING = {
  microphone: false, connections: false, room: false
};
const INITIAL_AUDIO_SETTINGS = {
  volume: 0.8, noiseSuppression: true, echoCancellation: true, autoGainControl: true, sampleRate: 48000
};

const createParticipant = (data) => ({
  isMuted: data.isMuted ?? false, isSpeaking: data.isSpeaking ?? false,
  joinedAt: data.joinedAt || new Date().toISOString(), ...data,
});
const updateActivity = (state) => {
  state.lastActivity = new Date().toISOString();
};
const cleanupStream = (stream) => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
};
const closePeerConnection = (connection) => {
  if (connection && connection.connectionState !== 'closed') {
    try {
      connection.close();
    } catch (error) {
      console.warn('Error closing peer connection:', error);
    }
  }
};

const initialState = {
  participants: [], speakingUsers: [], isMicrophoneEnabled: false, isMuted: false, 
  isPushToTalkActive: false, localStream: null, peerConnections: {}, isConnected: false, 
  connectionStats: { ...INITIAL_CONNECTION_STATS }, audioSettings: { ...INITIAL_AUDIO_SETTINGS },
  connectionQuality: { ...INITIAL_CONNECTION_QUALITY }, lastActivity: null, error: null, 
  loading: { ...INITIAL_LOADING }, messages: [], unreadMessages: 0,
};

const voiceSlice = createSlice({
  name: 'voice',
  initialState,
  reducers: {
    setConnected: (state, action) => {
      state.isConnected = action.payload;
      updateActivity(state);
      if (!action.payload) {
        state.speakingUsers = [];
        state.isPushToTalkActive = false;
        state.connectionQuality.overall = 'disconnected';
      }
    },
    setParticipants: (state, action) => {
      state.participants = action.payload.map(createParticipant);
      updateActivity(state);
    },
    addParticipant: (state, action) => {
      const newParticipant = createParticipant(action.payload);
      const existingIndex = state.participants.findIndex(
        p => p.userId === newParticipant.userId || p.socketId === newParticipant.socketId
      );
      if (existingIndex === -1) {
        state.participants.push(newParticipant);
      } else {
        Object.assign(state.participants[existingIndex], newParticipant);
      }
      updateActivity(state);
    },
    removeParticipant: (state, action) => {
      const { socketId, userId } = action.payload;
      state.participants = state.participants.filter(
        p => p.socketId !== socketId && p.userId !== userId
      );
      if (userId) {
        state.speakingUsers = state.speakingUsers.filter(id => id !== userId);
      }
      updateActivity(state);
    },
    setUserSpeaking: (state, action) => {
      const { userId, isSpeaking, socketId } = action.payload;
      const now = new Date().toISOString();
      if (isSpeaking) {
        if (!state.speakingUsers.includes(userId)) {
          state.speakingUsers.push(userId);
        }
      } else {
        state.speakingUsers = state.speakingUsers.filter(id => id !== userId);
      }
      const participant = state.participants.find(p => 
        p.userId === userId || p.socketId === socketId
      );
      if (participant) {
        participant.isSpeaking = isSpeaking;
        if (isSpeaking) {
            participant.lastSpeakingTime = now;
        }
      }
      updateActivity(state);
    },
    setUserMuted: (state, action) => {
      const { socketId, isMuted, userId } = action.payload;
      const now = new Date().toISOString();
      const participant = state.participants.find(p => 
        p.socketId === socketId || p.userId === userId
      );
      if (participant) {
        participant.isMuted = isMuted;
        participant.lastMuteChange = now;
        if (isMuted && participant.isSpeaking) {
          state.speakingUsers = state.speakingUsers.filter(id => id !== participant.userId);
          participant.isSpeaking = false;
        }
      }
      updateActivity(state);
    },
    setMicrophoneEnabled: (state, action) => {
      state.isMicrophoneEnabled = action.payload;
      updateActivity(state);
      if (!action.payload) {
        state.isPushToTalkActive = false;
        const currentUser = state.participants.find(p => p.isCurrentUser);
        if (currentUser) {
          state.speakingUsers = state.speakingUsers.filter(id => id !== currentUser.userId);
        }
      }
    },
    setMuted: (state, action) => {
      const newMutedState = action.payload;
      if (state.isMuted !== newMutedState) {
        state.isMuted = newMutedState;
        updateActivity(state);
        if (newMutedState && state.isPushToTalkActive) {
          state.isPushToTalkActive = false;
          const currentUser = state.participants.find(p => p.isCurrentUser);
          if (currentUser) {
            state.speakingUsers = state.speakingUsers.filter(id => id !== currentUser.userId);
          }
        }
      }
    },
    setPushToTalkActive: (state, action) => {
      const newState = action.payload;
      if (state.isPushToTalkActive !== newState) {
        state.isPushToTalkActive = newState;
        updateActivity(state);
        const currentUser = state.participants.find(p => p.isCurrentUser);
        if (!currentUser) return;
        if (newState) {
          if (!state.isMuted && !state.speakingUsers.includes(currentUser.userId)) {
            state.speakingUsers.push(currentUser.userId);
          }
        } else {
          state.speakingUsers = state.speakingUsers.filter(id => id !== currentUser.userId);
        }
      }
    },
    setLocalStream: (state, action) => {
      const stream = action.payload;
      if (state.localStream && stream !== state.localStream) {
        cleanupStream(state.localStream);
      }
      state.localStream = stream;
      state.isMicrophoneEnabled = !!stream;
      updateActivity(state);
    },
    addPeerConnection: (state, action) => {
      const { socketId, connection, metadata = {} } = action.payload;
      state.peerConnections[socketId] = {
        connection, socketId, userId: metadata.userId, state: 'connecting',
        createdAt: new Date().toISOString(), lastStateChange: new Date().toISOString(),
        stats: { packetsSent: 0, packetsReceived: 0, bytesSent: 0, bytesReceived: 0 }
      };
      state.connectionStats.total = Object.keys(state.peerConnections).length;
      updateActivity(state);
    },
    updateConnectionState: (state, action) => {
      const { socketId, state: connectionState, stats } = action.payload;
      const peerConnection = state.peerConnections[socketId];
      if (!peerConnection) return;
      const previousState = peerConnection.state;
      const now = new Date().toISOString();
      const stateMap = {
        'connected': 'connected', 'connecting': 'connecting', 
        'failed': 'failed', 'disconnected': 'disconnected'
      };
      if (stateMap[previousState]) {
        state.connectionStats[stateMap[previousState]]--;
      }
      peerConnection.state = connectionState;
      peerConnection.lastStateChange = now;
      if (stateMap[connectionState]) {
        state.connectionStats[stateMap[connectionState]]++;
      }
      if (stats) {
        peerConnection.stats = { ...peerConnection.stats, ...stats };
      }
      updateActivity(state);
    },
    removePeerConnection: (state, action) => {
      const { socketId } = action.payload;
      const peerConnection = state.peerConnections[socketId];
      if (!peerConnection) return;
      const stateMap = {
        'connected': 'connected', 'connecting': 'connecting', 
        'failed': 'failed', 'disconnected': 'disconnected'
      };
      if (stateMap[peerConnection.state]) {
        state.connectionStats[stateMap[peerConnection.state]]--;
      }
      delete state.peerConnections[socketId];
      state.connectionStats.total = Object.keys(state.peerConnections).length;
      updateActivity(state);
    },
    clearPeerConnections: (state) => {
      Object.values(state.peerConnections).forEach(({ connection }) => {
        closePeerConnection(connection);
      });
      state.peerConnections = {};
      state.connectionStats = { ...INITIAL_CONNECTION_STATS };
      updateActivity(state);
    },
    updateAudioSettings: (state, action) => {
      Object.assign(state.audioSettings, action.payload);
      updateActivity(state);
    },
    updateConnectionQuality: (state, action) => {
      Object.assign(state.connectionQuality, action.payload);
      updateActivity(state);
    },
    setLoading: (state, action) => {
      Object.assign(state.loading, action.payload);
    },
    setError: (state, action) => {
      state.error = action.payload;
      updateActivity(state);
      if (action.payload) {
        state.loading = { ...INITIAL_LOADING };
      }
    },
    cleanupStaleSpeakers: (state) => {
      const now = new Date();
      const updatedSpeakingUsers = [];
      state.participants.forEach(participant => {
        if (state.speakingUsers.includes(participant.userId)) {
          if (participant.lastSpeakingTime) {
            const lastSpeaking = new Date(participant.lastSpeakingTime);
            if ((now - lastSpeaking) < STALE_TIMEOUT) {
              updatedSpeakingUsers.push(participant.userId);
            } else {
              participant.isSpeaking = false;
            }
          } else {
            updatedSpeakingUsers.push(participant.userId);
          }
        }
      });
      state.speakingUsers = updatedSpeakingUsers;
      updateActivity(state);
    },
    setCurrentUser: (state, action) => {
      const userId = action.payload;
      state.participants.forEach(participant => {
        participant.isCurrentUser = participant.userId === userId;
      });
    },
    addMessage: (state, action) => {
      state.messages.push({
        ...action.payload,
        timestamp: action.payload.timestamp || new Date().toISOString()
      });
      const isIncomingUserMessage = action.payload.type === 'user' && 
                                   action.payload.userId !== state.currentUser?.userId;
      if (isIncomingUserMessage) {
        state.unreadMessages = (state.unreadMessages || 0) + 1;
      }
      updateActivity(state);
    },
    clearMessages: (state) => {
      state.messages = [];
      state.unreadMessages = 0;
    },
    markMessagesAsRead: (state) => {
      state.unreadMessages = 0;
    },
    resetVoiceState: (state) => {
      cleanupStream(state.localStream);
      Object.values(state.peerConnections).forEach(({ connection }) => {
        closePeerConnection(connection);
      });
      return {
        ...initialState,
        audioSettings: state.audioSettings,
        connectionQuality: { ...INITIAL_CONNECTION_QUALITY }
      };
    },
    resetRoomState: (state) => {
      Object.values(state.peerConnections).forEach(({ connection }) => {
        closePeerConnection(connection);
      });
      state.participants = [];
      state.speakingUsers = [];
      state.isPushToTalkActive = false;
      state.peerConnections = {};
      state.connectionStats = { ...INITIAL_CONNECTION_STATS };
      state.connectionQuality = { ...INITIAL_CONNECTION_QUALITY };
      state.error = null;
      updateActivity(state);
    },
    updateMultipleParticipants: (state, action) => {
      const updates = action.payload;
      updates.forEach(update => {
        const participant = state.participants.find(p => 
          p.userId === update.userId || p.socketId === update.socketId
        );
        if (participant) {
          Object.assign(participant, update);
        }
      });
      updateActivity(state);
    },
    cleanupInactiveConnections: (state) => {
      const now = new Date();
      const INACTIVE_TIMEOUT = 30000;
      Object.entries(state.peerConnections).forEach(([socketId, connection]) => {
        const lastChange = new Date(connection.lastStateChange);
        if ((now - lastChange) > INACTIVE_TIMEOUT && connection.state === 'disconnected') {
          delete state.peerConnections[socketId];
        }
      });
      state.connectionStats.total = Object.keys(state.peerConnections).length;
    }
  }
});

const selectVoice = (state) => state.voice;

const selectConnectionHealthInternal = createSelector(
  (state) => selectVoice(state).connectionStats,
  (stats) => {
    const { connected, total } = stats;
    if (total === 0) return 'unknown';
    if (connected === total) return 'excellent';
    if (connected >= total * 0.7) return 'good';
    if (connected >= total * 0.4) return 'fair';
    return 'poor';
  }
);

const selectCurrentUserInternal = createSelector(
  (state) => selectVoice(state).participants,
  (participants) => participants.find(p => p.isCurrentUser)
);

export const voiceSelectors = {
  selectParticipants: createSelector(selectVoice, (voice) => voice.participants),
  selectSpeakingUsers: createSelector(selectVoice, (voice) => voice.speakingUsers),
  selectIsConnected: createSelector(selectVoice, (voice) => voice.isConnected),
  selectIsMuted: createSelector(selectVoice, (voice) => voice.isMuted),
  selectError: createSelector(selectVoice, (voice) => voice.error),
  selectMessages: createSelector(selectVoice, (voice) => voice.messages || []), 
  selectUnreadMessages: createSelector(selectVoice, (voice) => voice.unreadMessages || 0),
  selectConnectionStats: createSelector(selectVoice, (voice) => voice.connectionStats),
  selectPeerConnections: createSelector(selectVoice, (voice) => voice.peerConnections),

  
  selectCurrentUser: selectCurrentUserInternal, 

  selectOtherParticipants: createSelector(
    (state) => selectVoice(state).participants,
    selectCurrentUserInternal,
    (participants, currentUser) => participants.filter(p => p !== currentUser)
  ),
  
  selectActiveConnections: createSelector(
    (state) => selectVoice(state).peerConnections,
    (peerConnections) => Object.values(peerConnections).filter(pc => pc.state === 'connected').length
  ),

  selectConnectionHealth: selectConnectionHealthInternal, 

  selectIsSpeaking: createSelector(
    (state) => selectVoice(state).speakingUsers,
    selectCurrentUserInternal,
    (speakingUsers, currentUser) => 
      currentUser ? speakingUsers.includes(currentUser.userId) : false
  ),

  selectSpeakingParticipants: createSelector(
    (state) => selectVoice(state).participants,
    (state) => selectVoice(state).speakingUsers,
    (participants, speakingUsers) =>
      participants.filter(p => speakingUsers.includes(p.userId))
  ),

  selectConnectedParticipants: createSelector(
    (state) => selectVoice(state).participants,
    (state) => selectVoice(state).peerConnections,
    (participants, peerConnections) => {
      const connectedUserIds = Object.values(peerConnections)
        .filter(pc => pc.state === 'connected')
        .map(pc => pc.userId)
        .filter(id => id);
      
      return participants.filter(p => connectedUserIds.includes(p.userId));
    }
  ),

  selectRoomStats: createSelector(
    (state) => selectVoice(state).participants,
    (state) => selectVoice(state).speakingUsers,
    (state) => selectVoice(state).connectionStats,
    selectConnectionHealthInternal, 
    (participants, speakingUsers, connectionStats, connectionHealth) => ({
      totalParticipants: participants.length,
      speakingCount: speakingUsers.length,
      connectedCount: connectionStats.connected,
      connectionHealth: connectionHealth
    })
  ),
  
  selectParticipantBySocketId: (socketId) => createSelector(
    (state) => selectVoice(state).participants,
    (participants) => participants.find(p => p.socketId === socketId)
  ),

  selectParticipantByUserId: (userId) => createSelector(
    (state) => selectVoice(state).participants,
    (participants) => participants.find(p => p.userId === userId)
  ),
};

export const {
  setConnected, setParticipants, addParticipant, removeParticipant, setUserSpeaking,
  setUserMuted, setMicrophoneEnabled, setMuted, setPushToTalkActive, setLocalStream,
  addPeerConnection, updateConnectionState, removePeerConnection, clearPeerConnections,
  updateAudioSettings, updateConnectionQuality, setLoading, setError, cleanupStaleSpeakers,
  setCurrentUser, addMessage, clearMessages, markMessagesAsRead, resetVoiceState,
  resetRoomState, updateMultipleParticipants, cleanupInactiveConnections
} = voiceSlice.actions;

export default voiceSlice.reducer;