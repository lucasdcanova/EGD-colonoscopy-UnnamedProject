import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../utils/database';
import { ApiError } from '../middleware/error.middleware';
import { Annotation } from '../../types/endoscopy.types';

/**
 * Create a new annotation for an image
 */
export async function createAnnotation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { imageId } = req.params;
    const annotationData = req.body;
    const annotatorId = req.user!.id;

    // Verify image exists
    const imageResult = await db.query(
      'SELECT id FROM endoscopy_images WHERE id = $1',
      [imageId]
    );
    
    if (imageResult.rows.length === 0) {
      throw new ApiError(404, 'Image not found');
    }

    // Check if annotator already has annotation for this lesion
    const existingAnnotation = await db.query(
      'SELECT id FROM annotations WHERE image_id = $1 AND annotator_id = $2 AND lesion_id = $3',
      [imageId, annotatorId, annotationData.lesionId]
    );

    if (existingAnnotation.rows.length > 0) {
      throw new ApiError(409, 'Annotation already exists for this lesion');
    }

    // Create annotation
    const annotationId = uuidv4();
    const result = await db.query(
      `INSERT INTO annotations (
        id, image_id, annotator_id, annotation_type, lesion_id,
        category, bbox, segmentation, paris_classification,
        jnet_classification, kudo_pattern, nice_classification,
        forrest_classification, severity, confidence, clinical_description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        annotationId, imageId, annotatorId, 'manual', annotationData.lesionId,
        annotationData.category, JSON.stringify(annotationData.bbox),
        annotationData.segmentation ? JSON.stringify(annotationData.segmentation) : null,
        annotationData.parisClassification || null,
        annotationData.jnetClassification || null,
        annotationData.kudoPitPattern || null,
        annotationData.niceClassification || null,
        annotationData.forrestClassification || null,
        annotationData.severity || null,
        annotationData.confidence || null,
        annotationData.clinicalDescription || null
      ]
    );

    // Update annotator statistics
    await db.query(
      'UPDATE annotators SET total_annotations = total_annotations + 1, last_active = CURRENT_TIMESTAMP WHERE id = $1',
      [annotatorId]
    );

    res.status(201).json({
      success: true,
      annotation: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all annotations for an image
 */
export async function getAnnotations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { imageId } = req.params;

    const result = await db.query(
      `SELECT 
        a.*,
        an.specialty as annotator_specialty,
        an.years_experience as annotator_experience
      FROM annotations a
      JOIN annotators an ON a.annotator_id = an.id
      WHERE a.image_id = $1
      ORDER BY a.lesion_id, a.created_at`,
      [imageId]
    );

    res.json({
      success: true,
      annotations: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update an existing annotation
 */
export async function updateAnnotation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { annotationId } = req.params;
    const annotationData = req.body;
    const userId = req.user!.id;

    // Verify ownership
    const annotation = await db.query(
      'SELECT annotator_id FROM annotations WHERE id = $1',
      [annotationId]
    );

    if (annotation.rows.length === 0) {
      throw new ApiError(404, 'Annotation not found');
    }

    if (annotation.rows[0].annotator_id !== userId) {
      throw new ApiError(403, 'You can only update your own annotations');
    }

    // Update annotation
    const result = await db.query(
      `UPDATE annotations SET
        category = $2,
        bbox = $3,
        segmentation = $4,
        paris_classification = $5,
        jnet_classification = $6,
        kudo_pattern = $7,
        nice_classification = $8,
        forrest_classification = $9,
        severity = $10,
        confidence = $11,
        clinical_description = $12,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *`,
      [
        annotationId,
        annotationData.category,
        JSON.stringify(annotationData.bbox),
        annotationData.segmentation ? JSON.stringify(annotationData.segmentation) : null,
        annotationData.parisClassification || null,
        annotationData.jnetClassification || null,
        annotationData.kudoPitPattern || null,
        annotationData.niceClassification || null,
        annotationData.forrestClassification || null,
        annotationData.severity || null,
        annotationData.confidence || null,
        annotationData.clinicalDescription || null
      ]
    );

    res.json({
      success: true,
      annotation: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete an annotation (admin only)
 */
export async function deleteAnnotation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { annotationId } = req.params;

    const result = await db.query(
      'DELETE FROM annotations WHERE id = $1 RETURNING id',
      [annotationId]
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, 'Annotation not found');
    }

    res.json({
      success: true,
      message: 'Annotation deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get annotation statistics for an image
 */
export async function getAnnotationStats(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { imageId } = req.params;

    // Get annotation counts by category
    const categoryStats = await db.query(
      `SELECT 
        category,
        COUNT(DISTINCT annotator_id) as annotator_count,
        COUNT(*) as total_annotations,
        AVG(confidence) as avg_confidence
      FROM annotations
      WHERE image_id = $1
      GROUP BY category`,
      [imageId]
    );

    // Get inter-annotator agreement
    const agreementStats = await db.query(
      `SELECT 
        lesion_id,
        COUNT(DISTINCT category) as unique_categories,
        COUNT(DISTINCT annotator_id) as annotator_count,
        MODE() WITHIN GROUP (ORDER BY category) as consensus_category
      FROM annotations
      WHERE image_id = $1
      GROUP BY lesion_id
      HAVING COUNT(DISTINCT annotator_id) > 1`,
      [imageId]
    );

    // Calculate agreement score
    let agreementScore = 0;
    if (agreementStats.rows.length > 0) {
      const totalAgreements = agreementStats.rows.reduce((sum, row) => {
        return sum + (row.unique_categories === 1 ? 1 : 0);
      }, 0);
      agreementScore = totalAgreements / agreementStats.rows.length;
    }

    res.json({
      success: true,
      stats: {
        categoryDistribution: categoryStats.rows,
        interAnnotatorAgreement: agreementScore,
        lesionsWithMultipleAnnotators: agreementStats.rows.length,
      },
    });
  } catch (error) {
    next(error);
  }
}