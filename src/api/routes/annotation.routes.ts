import { Router } from 'express';
import { 
  createAnnotation, 
  getAnnotations, 
  updateAnnotation, 
  deleteAnnotation,
  getAnnotationStats 
} from '../controllers/annotation.controller';
import { authenticateUser, requireRole } from '../middleware/auth.middleware';
import { validateAnnotationRequest } from '../middleware/validation.middleware';

const router = Router();

/**
 * POST /api/annotations/:imageId
 * Create a new annotation for an image
 */
router.post(
  '/:imageId',
  authenticateUser,
  validateAnnotationRequest,
  createAnnotation
);

/**
 * GET /api/annotations/:imageId
 * Get all annotations for an image
 */
router.get(
  '/:imageId',
  authenticateUser,
  getAnnotations
);

/**
 * PUT /api/annotations/:annotationId
 * Update an existing annotation
 */
router.put(
  '/:annotationId',
  authenticateUser,
  validateAnnotationRequest,
  updateAnnotation
);

/**
 * DELETE /api/annotations/:annotationId
 * Delete an annotation (admin only)
 */
router.delete(
  '/:annotationId',
  authenticateUser,
  requireRole(['admin', 'lead_annotator']),
  deleteAnnotation
);

/**
 * GET /api/annotations/stats/:imageId
 * Get annotation statistics for an image
 */
router.get(
  '/stats/:imageId',
  authenticateUser,
  getAnnotationStats
);

export default router;