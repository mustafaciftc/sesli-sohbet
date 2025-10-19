import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = "http://localhost:5000/api";
const TOKEN_KEY = "voice_chat_token";

const tokenManager = {
  getToken: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('Token get error:', error);
      return null;
    }
  },
  
  setToken: (token) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      return true;
    } catch (error) {
      console.error('Token set error:', error);
      return false;
    }
  },
  
  removeToken: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      return true;
    } catch (error) {
      console.error('Token remove error:', error);
      return false;
    }
  },
  
  decodeToken: (token) => {
    try {
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        userId: payload.userId,
        role: payload.role,
        exp: payload.exp,
        isExpired: Date.now() >= payload.exp * 1000
      };
    } catch (error) {
      console.error('Token decode error:', error);
      return null;
    }
  }
};

const initialState = {
  user: null,
  token: tokenManager.getToken(),
  isLoading: false,
  isAuthenticated: false, 
  isGuest: false,
  error: null,
  lastActivity: null
};

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.request.use(
  (config) => {
    const token = tokenManager.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      tokenManager.removeToken();
      window.dispatchEvent(new Event('unauthorized'));
    }
    return Promise.reject(error);
  }
);

export const register = createAsyncThunk(
  "auth/register",
  async (userData, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.post('/auth/register', userData);
      
      if (!tokenManager.setToken(data.data.token)) {
        return rejectWithValue("Token kaydedilemedi");
      }
      
      return data.data;
    } catch (err) {
      const message = err.response?.data?.message || 
                     err.message || 
                     "Kayıt işlemi başarısız oldu";
      return rejectWithValue(message);
    }
  }
);

export const login = createAsyncThunk(
  "auth/login",
  async (credentials, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.post('/auth/login', credentials);
      
      if (!tokenManager.setToken(data.data.token)) {
        return rejectWithValue("Token kaydedilemedi");
      }
      
      return data.data;
    } catch (err) {
      const message = err.response?.data?.message || 
                     err.message || 
                     "Giriş işlemi başarısız oldu";
      return rejectWithValue(message);
    }
  }
);

export const guestLogin = createAsyncThunk(
  "auth/guestLogin",
  async (username = null, { rejectWithValue }) => {
    try {
      const payload = username ? { username } : {};
      const { data } = await apiClient.post('/auth/guest', payload);
      
      if (!tokenManager.setToken(data.data.token)) {
        return rejectWithValue("Token kaydedilemedi");
      }
      
      return data.data;
    } catch (err) {
      const message = err.response?.data?.message || 
                     err.message || 
                     "Misafir girişi başarısız";
      return rejectWithValue(message);
    }
  }
);

export const getCurrentUser = createAsyncThunk(
  "auth/getCurrentUser",
  async (_, { getState, rejectWithValue, dispatch }) => {
    try {
      const { token } = getState().auth;
      
      if (!token) {
        tokenManager.removeToken();
        return rejectWithValue("Token bulunamadı");
      }

      const tokenInfo = tokenManager.decodeToken(token);
      if (!tokenInfo) {
        tokenManager.removeToken();
        return rejectWithValue("Geçersiz token");
      }

      if (tokenInfo.isExpired) {
        tokenManager.removeToken();
        return rejectWithValue("Token süresi dolmuş");
      }

      const { data } = await apiClient.get('/auth/me');
      return data.data.user;

    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 404) {
        tokenManager.removeToken();
        dispatch(authSlice.actions.clearAuthState());
      }

      const message = err.response?.data?.message || 
                     err.message || 
                     "Kullanıcı bilgileri alınamadı";
      return rejectWithValue(message);
    }
  }
);

export const refreshToken = createAsyncThunk(
  "auth/refreshToken",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      if (!token) {
        return rejectWithValue("Token bulunamadı");
      }

      const { data } = await apiClient.post('/auth/refresh', { token });
      
      if (data.data.token && tokenManager.setToken(data.data.token)) {
        return data.data;
      }
      
      return rejectWithValue("Token yenilenemedi");
    } catch (err) {
      tokenManager.removeToken();
      const message = err.response?.data?.message || "Token yenileme başarısız";
      return rejectWithValue(message);
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: () => {
      tokenManager.removeToken();
      return {
        ...initialState,
        token: null,
        isAuthenticated: false
      };
    },
    clearError: (state) => {
      state.error = null;
    },
    clearAuthState: () => {
      return {
        ...initialState,
        token: null,
        isAuthenticated: false
      };
    },
    updateUser: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    setLastActivity: (state) => {
      state.lastActivity = Date.now();
    }
  },
  extraReducers: (builder) => {
    const handlePending = (state) => {
      state.isLoading = true;
      state.error = null;
    };

    const handleAuthFulfilled = (state, action) => {
      state.isLoading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isGuest = action.payload.user?.role === 'guest';
      state.lastActivity = Date.now();
      state.error = null;
    };

    const handleRejected = (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    };

    builder
      .addCase(register.pending, handlePending)
      .addCase(register.fulfilled, handleAuthFulfilled)
      .addCase(register.rejected, handleRejected)

      .addCase(login.pending, handlePending)
      .addCase(login.fulfilled, handleAuthFulfilled)
      .addCase(login.rejected, handleRejected)

      .addCase(guestLogin.pending, handlePending)
      .addCase(guestLogin.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isGuest = true; 
        state.lastActivity = Date.now();
        state.error = null;
      })
      .addCase(guestLogin.rejected, handleRejected)

      .addCase(getCurrentUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
        state.isGuest = action.payload.role === 'guest';
        state.lastActivity = Date.now();
        state.error = null;
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.isGuest = false;
        state.error = action.payload;
        console.warn("Auth state cleared:", action.payload);
      })

      .addCase(refreshToken.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.lastActivity = Date.now();
      })
      .addCase(refreshToken.rejected, (state) => {
        state.error = "Session refresh failed";
      });
  },
});

export const startAutoLogout = () => (dispatch, getState) => {
  const CHECK_INTERVAL = 60000; 
  const MAX_INACTIVITY = 30 * 60 * 1000; 

  setInterval(() => {
    const state = getState();
    const { lastActivity, isAuthenticated } = state.auth;

    if (isAuthenticated && lastActivity && 
        Date.now() - lastActivity > MAX_INACTIVITY) {
      dispatch(logout());
      console.log('Auto-logout due to inactivity');
    }
  }, CHECK_INTERVAL);
};

export const trackActivity = () => (dispatch) => {
  const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
  
  const updateActivity = () => {
    dispatch(authSlice.actions.setLastActivity());
  };

  events.forEach(event => {
    document.addEventListener(event, updateActivity, { passive: true });
  });

  return () => {
    events.forEach(event => {
      document.removeEventListener(event, updateActivity);
    });
  };
};

export const { 
  logout, 
  clearError, 
  clearAuthState, 
  updateUser,
  setLastActivity 
} = authSlice.actions;

export default authSlice.reducer;