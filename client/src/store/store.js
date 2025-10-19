import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

import roomsReducer from '../features/rooms/roomsSlice';
import authReducer from '../features/auth/authSlice';
import voiceReducer from '../features/voice/voiceSlice';

const authPersistConfig = {
  key: 'auth',
  storage,
  whitelist: ['token', 'user']
};

const persistedAuthReducer = persistReducer(authPersistConfig, authReducer);

export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    rooms: roomsReducer,
    voice: voiceReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        ignoredPaths: ['register'], 
      },
    }),
});

export const persistor = persistStore(store);

export default store;