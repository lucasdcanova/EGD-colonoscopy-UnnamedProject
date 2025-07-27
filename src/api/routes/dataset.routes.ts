import { Router } from 'express';
import { 
  getDatasetStats, 
  getDatasetSplit, 
  exportDataset,
  reassignDatasetSplit 
} from '../controllers/dataset.controller';
import { authenticateUser, requireRole } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/dataset/stats
 * Get overall dataset statistics
 */
router.get(
  '/stats',
  authenticateUser,
  getDatasetStats
);

/**
 * GET /api/dataset/split/:split
 * Get images in a specific dataset split (train/val/test)
 */
router.get(
  '/split/:split',
  authenticateUser,
  getDatasetSplit
);

/**
 * GET /api/dataset/export
 * Export dataset in various formats (COCO, JSONL)
 */
router.get(
  '/export',
  authenticateUser,
  requireRole(['admin', 'researcher']),
  exportDataset
);

/**
 * POST /api/dataset/reassign
 * Reassign dataset splits (admin only)
 */
router.post(
  '/reassign',
  authenticateUser,
  requireRole(['admin']),
  reassignDatasetSplit
);

export default router;