const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { generalLimiter, authLimiter, messageLimiter } = require('./middlewares/rateLimit');
const securityMiddleware = require('./middlewares/security');
const { sanitizeInput } = require('./utils/sanitize');
require('dotenv').config();

const { testConnection, closePool } = require('./db');
const authRoutes = require('./routes/auth');
const roomsRoutes = require('./routes/room');
const setupSocketHandlers = require('./socketHandlers');
const socketAuthMiddleware = require('./middlewares/socketAuth');

const requiredEnvVars = ['JWT_SECRET', 'CORS_ORIGIN', 'PORT'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error(`❌ Missing environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN.split(','),
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(securityMiddleware);
app.use('/api/', generalLimiter);
app.use('/api/auth', authRoutes, authLimiter);
app.use('/api/rooms', roomsRoutes, messageLimiter);

app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('Global Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

io.use(socketAuthMiddleware);
setupSocketHandlers(io);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ Database connection failed. Exiting...');
      process.exit(1);
    }

    server.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Server startup error:', error);
    process.exit(1);
  }
};

const gracefulShutdown = async () => {
  console.log('\n⏳ Shutting down gracefully...');
  server.close(async () => {
    console.log('✅ HTTP server closed');
    await closePool();
    console.log('✅ Database connections closed');
    console.log('👋 Goodbye!');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('⚠️ Forcing shutdown...');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  gracefulShutdown();
});

startServer();