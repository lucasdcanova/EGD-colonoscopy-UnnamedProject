import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: 'not connected (test mode)',
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Backend API is working!',
    environment: process.env.NODE_ENV || 'development',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Test endpoint: http://localhost:${PORT}/api/test`);
});