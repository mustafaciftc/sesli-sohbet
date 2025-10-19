import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const initialState = {
  rooms: [],
  currentRoom: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  },
  userRooms: [],
  previousStates: {}
};

const makeApiCall = async (url, options = {}, getState) => {
  try {
    const { token } = getState().auth;
    const response = await axios({
      url,
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: 15000
    });
    return response.data;
  } catch (error) {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message || 'İşlem başarısız oldu';
    throw Object.assign(new Error(message), { status });
  }
};

export const fetchRooms = createAsyncThunk(
  'rooms/fetchRooms',
  async ({ page = 1, limit = 10, forceRefresh = false } = {}, { rejectWithValue, getState }) => {
    try {
      const data = await makeApiCall(
        `${API_URL}/rooms?page=${page}&limit=${limit}&t=${forceRefresh ? Date.now() : ''}`,
        {},
        getState
      );
      return data.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchRoomById = createAsyncThunk(
  'rooms/fetchRoomById',
  async (roomId, { rejectWithValue, getState }) => {
    try {
      const data = await makeApiCall(
        `${API_URL}/rooms/${roomId}`,
        {},
        getState
      );
      return data.data.room;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createRoom = createAsyncThunk(
  'rooms/createRoom',
  async (roomData, { rejectWithValue, getState }) => {
    try {
      if (!roomData.name?.trim()) {
        throw Object.assign(new Error('Oda adı gereklidir'), { status: 400 });
      }
      const data = await makeApiCall(`${API_URL}/rooms`, { method: 'POST', data: roomData }, getState);
      return data.data.room;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateRoom = createAsyncThunk(
  'rooms/updateRoom',
  async ({ roomId, roomData }, { rejectWithValue, getState, dispatch }) => {
    try {
      if (!roomData.name?.trim()) {
        throw Object.assign(new Error('Oda adı gereklidir'), { status: 400 });
      }
      dispatch(roomsSlice.actions.optimisticUpdateRoom({ roomId, roomData }));
      const data = await makeApiCall(`${API_URL}/rooms/${roomId}`, { method: 'PUT', data: roomData }, getState);
      return data.data.room;
    } catch (error) {
      dispatch(roomsSlice.actions.rollbackOptimisticUpdate(roomId));
      return rejectWithValue(error.message);
    }
  }
);

export const deleteRoom = createAsyncThunk(
  'rooms/deleteRoom',
  async (roomId, { rejectWithValue, getState, dispatch }) => {
    try {
      dispatch(roomsSlice.actions.optimisticDeleteRoom(roomId));
      await makeApiCall(`${API_URL}/rooms/${roomId}`, { method: 'DELETE' }, getState);
      return roomId;
    } catch (error) {
      dispatch(roomsSlice.actions.rollbackOptimisticDelete(roomId));
      return rejectWithValue(error.message);
    }
  }
);

export const joinRoom = createAsyncThunk(
  'rooms/joinRoom',
  async (roomId, { rejectWithValue, getState, dispatch }) => {
    try {
      const state = getState();
      
      if (state.rooms.userRooms.includes(parseInt(roomId))) {
        return { roomId, alreadyJoined: true };
      }

      dispatch(roomsSlice.actions.optimisticJoinRoom(roomId));

      const data = await makeApiCall(
        `${API_URL}/rooms/${roomId}/join`,
        { method: 'POST', data: {} },
        getState
      );

      dispatch(roomsSlice.actions.addUserRoom(roomId));
      
      return { ...data.data, roomId, alreadyJoined: false };
    } catch (error) {
      dispatch(roomsSlice.actions.rollbackOptimisticJoin(roomId));
      
      if (error.message.includes('Zaten bu odadasınız')) {
        dispatch(roomsSlice.actions.addUserRoom(roomId));
        return { roomId, alreadyJoined: true };
      }
      return rejectWithValue(error.message);
    }
  }
);

export const leaveRoom = createAsyncThunk(
  'rooms/leaveRoom',
  async (roomId, { rejectWithValue, getState, dispatch }) => {
    try {
      dispatch(roomsSlice.actions.optimisticLeaveRoom(roomId));

      await makeApiCall(
        `${API_URL}/rooms/${roomId}/leave`,
        { method: 'POST', data: {} },
        getState
      );

      dispatch(roomsSlice.actions.removeUserRoom(roomId));
      
      return roomId;
    } catch (error) {
      dispatch(roomsSlice.actions.rollbackOptimisticLeave(roomId));
      dispatch(roomsSlice.actions.removeUserRoom(roomId));
      return rejectWithValue(error.message);
    }
  }
);

const roomsSlice = createSlice({
  name: 'rooms',
  initialState,
  reducers: {
    optimisticUpdateRoom: (state, action) => {
      const { roomId, roomData } = action.payload;
      const roomIndex = state.rooms.findIndex(r => r.id === parseInt(roomId));
      if (roomIndex !== -1) {
        state.previousStates[roomId] = { ...state.rooms[roomIndex] };
        state.rooms[roomIndex] = { 
          ...state.rooms[roomIndex], 
          ...roomData, 
          updated_at: new Date().toISOString() 
        };
      }
      if (state.currentRoom?.id === parseInt(roomId)) {
        state.previousStates[`current_${roomId}`] = { ...state.currentRoom };
        state.currentRoom = { 
          ...state.currentRoom, 
          ...roomData, 
          updated_at: new Date().toISOString() 
        };
      }
    },
    
    rollbackOptimisticUpdate: (state, action) => {
      const roomId = action.payload;
      if (state.previousStates[roomId]) {
        const roomIndex = state.rooms.findIndex(r => r.id === parseInt(roomId));
        if (roomIndex !== -1) {
          state.rooms[roomIndex] = state.previousStates[roomId];
        }
        delete state.previousStates[roomId];
      }
      if (state.previousStates[`current_${roomId}`]) {
        state.currentRoom = state.previousStates[`current_${roomId}`];
        delete state.previousStates[`current_${roomId}`];
      }
    },
    
    optimisticDeleteRoom: (state, action) => {
      const roomId = parseInt(action.payload);
      const roomIndex = state.rooms.findIndex(r => r.id === roomId);
      if (roomIndex !== -1) {
        state.previousStates[`deleted_${roomId}`] = state.rooms[roomIndex];
        state.rooms.splice(roomIndex, 1);
      }
      if (state.currentRoom?.id === roomId) {
        state.previousStates[`current_deleted_${roomId}`] = state.currentRoom;
        state.currentRoom = null;
      }
    },
    
    rollbackOptimisticDelete: (state, action) => {
      const roomId = parseInt(action.payload);
      if (state.previousStates[`deleted_${roomId}`]) {
        state.rooms.push(state.previousStates[`deleted_${roomId}`]);
        delete state.previousStates[`deleted_${roomId}`];
      }
      if (state.previousStates[`current_deleted_${roomId}`]) {
        state.currentRoom = state.previousStates[`current_deleted_${roomId}`];
        delete state.previousStates[`current_deleted_${roomId}`];
      }
    },
    
    optimisticJoinRoom: (state, action) => {
      const roomId = action.payload;
      const roomIndex = state.rooms.findIndex(r => r.id === parseInt(roomId));
      if (roomIndex !== -1 && state.rooms[roomIndex].current_participants !== undefined) {
        state.previousStates[`participants_${roomId}`] = state.rooms[roomIndex].current_participants;
        state.rooms[roomIndex].current_participants += 1;
      }
      if (state.currentRoom?.id === parseInt(roomId) && state.currentRoom.current_participants !== undefined) {
        state.previousStates[`current_participants_${roomId}`] = state.currentRoom.current_participants;
        state.currentRoom.current_participants += 1;
      }
    },
    
    rollbackOptimisticJoin: (state, action) => {
      const roomId = action.payload;
      if (state.previousStates[`participants_${roomId}`] !== undefined) {
        const roomIndex = state.rooms.findIndex(r => r.id === parseInt(roomId));
        if (roomIndex !== -1) {
          state.rooms[roomIndex].current_participants = state.previousStates[`participants_${roomId}`];
        }
        delete state.previousStates[`participants_${roomId}`];
      }
      if (state.previousStates[`current_participants_${roomId}`] !== undefined) {
        state.currentRoom.current_participants = state.previousStates[`current_participants_${roomId}`];
        delete state.previousStates[`current_participants_${roomId}`];
      }
    },
    
    optimisticLeaveRoom: (state, action) => {
      const roomId = action.payload;
      const roomIndex = state.rooms.findIndex(r => r.id === parseInt(roomId));
      if (roomIndex !== -1 && state.rooms[roomIndex].current_participants !== undefined) {
        state.previousStates[`participants_${roomId}`] = state.rooms[roomIndex].current_participants;
        state.rooms[roomIndex].current_participants = Math.max(0, state.rooms[roomIndex].current_participants - 1);
      }
      if (state.currentRoom?.id === parseInt(roomId) && state.currentRoom.current_participants !== undefined) {
        state.previousStates[`current_participants_${roomId}`] = state.currentRoom.current_participants;
        state.currentRoom.current_participants = Math.max(0, state.currentRoom.current_participants - 1);
      }
    },
    
    rollbackOptimisticLeave: (state, action) => {
      const roomId = action.payload;
      if (state.previousStates[`participants_${roomId}`] !== undefined) {
        const roomIndex = state.rooms.findIndex(r => r.id === parseInt(roomId));
        if (roomIndex !== -1) {
          state.rooms[roomIndex].current_participants = state.previousStates[`participants_${roomId}`];
        }
        delete state.previousStates[`participants_${roomId}`];
      }
      if (state.previousStates[`current_participants_${roomId}`] !== undefined) {
        state.currentRoom.current_participants = state.previousStates[`current_participants_${roomId}`];
        delete state.previousStates[`current_participants_${roomId}`];
      }
    },
    
    clearCurrentRoom: (state) => {
      state.currentRoom = null;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    clearAll: () => initialState,
    
    addUserRoom: (state, action) => {
      const roomId = parseInt(action.payload);
      if (!state.userRooms.includes(roomId)) {
        state.userRooms.push(roomId);
      }
    },
    
    removeUserRoom: (state, action) => {
      const roomId = parseInt(action.payload);
      state.userRooms = state.userRooms.filter(id => id !== roomId);
    },
    
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    
    updateRoomParticipants: (state, action) => {
      const { roomId, participantCount } = action.payload;
      const roomIndex = state.rooms.findIndex(room => room.id === roomId);
      if (roomIndex !== -1) {
        state.rooms[roomIndex].current_participants = participantCount;
      }
      if (state.currentRoom?.id === roomId) {
        state.currentRoom.current_participants = participantCount;
      }
    },
    
    clearOptimisticUpdates: (state) => {
      state.previousStates = {};
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRooms.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRooms.fulfilled, (state, action) => {
        state.isLoading = false;
        state.rooms = action.payload.rooms;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchRooms.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(fetchRoomById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRoomById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentRoom = action.payload;
      })
      .addCase(fetchRoomById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(createRoom.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createRoom.fulfilled, (state, action) => {
        state.isLoading = false;
        state.rooms.unshift(action.payload);
      })
      .addCase(createRoom.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(updateRoom.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateRoom.fulfilled, (state, action) => {
        state.isLoading = false;
        const roomId = action.payload.id;
        delete state.previousStates[roomId];
        delete state.previousStates[`current_${roomId}`];
        const index = state.rooms.findIndex(r => r.id === action.payload.id);
        if (index !== -1) {
          state.rooms[index] = action.payload;
        }
        if (state.currentRoom?.id === action.payload.id) {
          state.currentRoom = action.payload;
        }
      })
      .addCase(updateRoom.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(deleteRoom.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteRoom.fulfilled, (state, action) => {
        state.isLoading = false;
        const roomId = action.payload;
        delete state.previousStates[`deleted_${roomId}`];
        delete state.previousStates[`current_deleted_${roomId}`];
      })
      .addCase(deleteRoom.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(joinRoom.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(joinRoom.fulfilled, (state, action) => {
        state.isLoading = false;
        const { roomId } = action.payload;
        delete state.previousStates[`participants_${roomId}`];
        delete state.previousStates[`current_participants_${roomId}`];
      })
      .addCase(joinRoom.rejected, (state, action) => {
        state.isLoading = false;
        if (!action.payload?.includes('Zaten bu odadasınız')) {
          state.error = action.payload;
        }
      })
      .addCase(leaveRoom.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(leaveRoom.fulfilled, (state, action) => {
        state.isLoading = false;
        const roomId = action.payload;
        delete state.previousStates[`participants_${roomId}`];
        delete state.previousStates[`current_participants_${roomId}`];
      })
      .addCase(leaveRoom.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  }
});

export const roomsSelectors = {
  selectAllRooms: (state) => state.rooms.rooms,
  selectCurrentRoom: (state) => state.rooms.currentRoom,
  selectIsLoading: (state) => state.rooms.isLoading,
  selectError: (state) => state.rooms.error,
  selectPagination: (state) => state.rooms.pagination,
  selectUserRooms: (state) => state.rooms.userRooms,
  selectIsUserInRoom: (state, roomId) => state.rooms.userRooms.includes(parseInt(roomId)),
  selectRoomById: (state, roomId) => 
    state.rooms.rooms.find(room => room.id === roomId) || state.rooms.currentRoom,
  selectAvailableRooms: (state) => 
    state.rooms.rooms.filter(room => 
      room.current_participants < room.max_participants
    ),
  selectFullRooms: (state) =>
    state.rooms.rooms.filter(room => 
      room.current_participants >= room.max_participants
    ),
  selectRoomStats: (state) => {
    const rooms = state.rooms.rooms;
    return {
      total: rooms.length,
      active: rooms.filter(r => (r.current_participants || 0) > 0).length,
      full: rooms.filter(r => r.current_participants >= r.max_participants).length,
      totalParticipants: rooms.reduce((sum, r) => sum + (r.current_participants || 0), 0)
    };
  }
};

export const { 
  optimisticUpdateRoom,
  rollbackOptimisticUpdate,
  optimisticDeleteRoom,
  rollbackOptimisticDelete,
  optimisticJoinRoom,
  rollbackOptimisticJoin,
  optimisticLeaveRoom,
  rollbackOptimisticLeave,
  clearCurrentRoom, 
  clearError, 
  clearAll,
  addUserRoom,
  removeUserRoom,
  setLoading,
  updateRoomParticipants,
  clearOptimisticUpdates
} = roomsSlice.actions;

export default roomsSlice.reducer;