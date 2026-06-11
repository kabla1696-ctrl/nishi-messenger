require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'Nishi',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
  },
  
  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || ''
  },
  
  // Firebase
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL
  },
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'Nishi-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  
  // Ghost Drop
  ghostDrop: {
    defaultRadius: 50, // meters
    maxRadius: 500,
    expiryDays: 7
  },
  
  // Proximity
  proximity: {
    defaultRadiusFeet: 3,
    maxRadiusFeet: 10,
    scanIntervalMs: 2000
  },
  
  // Ambient
  ambient: {
    updateIntervalMs: 30000, // 30 seconds
    activities: ['walking', 'running', 'driving', 'cycling', 'stationary', 'sleeping', 'eating', 'working', 'reading', 'listening_music'],
    environments: ['day', 'night', 'rain', 'cold', 'hot', 'indoor', 'outdoor']
  }
};
