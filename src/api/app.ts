import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { config } from 'dotenv';
import uploadRouter from './routes/upload.routes';
import annotationRouter from './routes/annotation.routes';
import datasetRouter from './routes/dataset.routes';
import debugRouter from './debug';
import { errorHandler } from './middleware/error.middleware';
import { requestLogger } from './middleware/logger.middleware';
import { rateLimiter } from './middleware/rateLimit.middleware';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
}));

// Compression for responses
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '50mb' })); // Large limit for base64 images
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use(requestLogger);

// Rate limiting
app.use('/api/', rateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// Serve static files in production (BEFORE API routes)
if (process.env.NODE_ENV === 'production') {
  // Since we're using tsx, __dirname might not be what we expect
  const rootDir = path.resolve(process.cwd());
  const frontendBuildPath = path.join(rootDir, 'frontend', 'build');
  
  console.log('📁 Serving static files from:', frontendBuildPath);
  console.log('📍 Current working directory:', process.cwd());
  console.log('📍 Root directory:', rootDir);
  
  // Serve static files with proper MIME types
  app.use(express.static(frontendBuildPath, {
    setHeaders: (res, path) => {
      if (path.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      } else if (path.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
      } else if (path.endsWith('.html')) {
        res.setHeader('Content-Type', 'text/html');
      }
    }
  }));
}

// API routes
app.use('/api/upload', uploadRouter);
app.use('/api/annotations', annotationRouter);
app.use('/api/dataset', datasetRouter);
app.use('/api', debugRouter);

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested API endpoint was not found',
    path: req.path,
  });
});

// Handle React routing - send all non-API routes to index.html
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    const rootDir = path.resolve(process.cwd());
    const frontendBuildPath = path.join(rootDir, 'frontend', 'build');
    const indexPath = path.join(frontendBuildPath, 'index.html');
    console.log('📄 Serving index.html for:', req.path);
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('❌ Error serving index.html:', err);
        res.status(500).send('Error loading the application');
      }
    });
  });
}

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  });
}

export default app;