import { Router } from 'express';
import multer from 'multer';
import { uploadImage, validateImageUpload, getUploadStatus } from '../controllers/upload.controller';
import { authenticateUser } from '../middleware/auth.middleware';
import { validateUploadRequest } from '../middleware/validation.middleware';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Routes

/**
 * POST /api/upload/image
 * Upload a new endoscopy image with metadata
 */
router.post(
  '/image',
  authenticateUser,
  upload.single('image'),
  validateUploadRequest,
  uploadImage
);

/**
 * POST /api/upload/validate
 * Validate image and metadata without uploading
 */
router.post(
  '/validate',
  authenticateUser,
  upload.single('image'),
  validateUploadRequest,
  validateImageUpload
);

/**
 * GET /api/upload/status/:imageId
 * Get upload processing status
 */
router.get(
  '/status/:imageId',
  authenticateUser,
  getUploadStatus
);

export default router;