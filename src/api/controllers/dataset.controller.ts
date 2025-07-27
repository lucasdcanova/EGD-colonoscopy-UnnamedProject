import { Request, Response, NextFunction } from 'express';
import { db } from '../../utils/database';
import { ApiError } from '../middleware/error.middleware';
import fs from 'fs/promises';
import path from 'path';

/**
 * Get overall dataset statistics
 */
export async function getDatasetStats(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Total images by split
    const splitStats = await db.query(
      `SELECT 
        dataset_split,
        COUNT(*) as count,
        COUNT(DISTINCT category) as unique_categories
      FROM endoscopy_images
      WHERE validation_status = 'validated'
      GROUP BY dataset_split`
    );

    // Category distribution
    const categoryStats = await db.query(
      `SELECT 
        category,
        COUNT(*) as total,
        COUNT(CASE WHEN dataset_split = 'train' THEN 1 END) as train_count,
        COUNT(CASE WHEN dataset_split = 'val' THEN 1 END) as val_count,
        COUNT(CASE WHEN dataset_split = 'test' THEN 1 END) as test_count
      FROM endoscopy_images
      WHERE validation_status = 'validated'
      GROUP BY category
      ORDER BY total DESC`
    );

    // Demographic distribution
    const demographicStats = await db.query(
      `SELECT 
        sex,
        age_range,
        COUNT(*) as count
      FROM endoscopy_images
      WHERE validation_status = 'validated'
      GROUP BY sex, age_range
      ORDER BY sex, age_range`
    );

    // Classification usage
    const classificationStats = await db.query(
      `SELECT 
        COUNT(CASE WHEN paris_classification IS NOT NULL THEN 1 END) as paris_count,
        COUNT(CASE WHEN jnet_classification IS NOT NULL THEN 1 END) as jnet_count,
        COUNT(CASE WHEN kudo_pattern IS NOT NULL THEN 1 END) as kudo_count,
        COUNT(CASE WHEN nice_classification IS NOT NULL THEN 1 END) as nice_count,
        COUNT(CASE WHEN forrest_classification IS NOT NULL THEN 1 END) as forrest_count,
        COUNT(*) as total_images
      FROM endoscopy_images
      WHERE validation_status = 'validated'`
    );

    // Annotation coverage
    const annotationCoverage = await db.query(
      `SELECT 
        COUNT(DISTINCT ei.id) as images_with_annotations,
        COUNT(DISTINCT CASE WHEN a.id IS NULL THEN ei.id END) as images_without_annotations,
        AVG(annotation_counts.annotation_count) as avg_annotations_per_image
      FROM endoscopy_images ei
      LEFT JOIN annotations a ON ei.id = a.image_id
      LEFT JOIN (
        SELECT image_id, COUNT(*) as annotation_count
        FROM annotations
        GROUP BY image_id
      ) annotation_counts ON ei.id = annotation_counts.image_id
      WHERE ei.validation_status = 'validated'`
    );

    // Quality metrics
    const qualityMetrics = await db.query(
      `SELECT 
        AVG(confidence) as avg_confidence,
        MIN(confidence) as min_confidence,
        MAX(confidence) as max_confidence,
        STDDEV(confidence) as confidence_stddev
      FROM endoscopy_images
      WHERE validation_status = 'validated'`
    );

    res.json({
      success: true,
      stats: {
        datasetSplits: splitStats.rows,
        categoryDistribution: categoryStats.rows,
        demographics: demographicStats.rows,
        classificationUsage: classificationStats.rows[0],
        annotationCoverage: annotationCoverage.rows[0],
        qualityMetrics: qualityMetrics.rows[0],
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get images in a specific dataset split
 */
export async function getDatasetSplit(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { split } = req.params;
    const { page = 1, limit = 50 } = req.query;

    if (!['train', 'val', 'test'].includes(split)) {
      throw new ApiError(400, 'Invalid dataset split');
    }

    const offset = (Number(page) - 1) * Number(limit);

    // Get total count
    const countResult = await db.query(
      'SELECT COUNT(*) FROM endoscopy_images WHERE dataset_split = $1 AND validation_status = \'validated\'',
      [split]
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // Get images
    const result = await db.query(
      `SELECT 
        id,
        image_hash,
        s3_path,
        category,
        sex,
        age_range,
        location,
        bbox,
        confidence,
        paris_classification,
        jnet_classification,
        kudo_pattern,
        nice_classification,
        forrest_classification,
        imaging_mode,
        procedure_type,
        upload_date,
        annotation_date
      FROM endoscopy_images
      WHERE dataset_split = $1 AND validation_status = 'validated'
      ORDER BY upload_date DESC
      LIMIT $2 OFFSET $3`,
      [split, limit, offset]
    );

    res.json({
      success: true,
      split,
      images: result.rows,
      pagination: {
        total: totalCount,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalCount / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Export dataset in various formats
 */
export async function exportDataset(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { format = 'coco', split = 'all' } = req.query;

    let whereClause = "WHERE validation_status = 'validated'";
    const params: any[] = [];

    if (split !== 'all') {
      whereClause += ' AND dataset_split = $1';
      params.push(split);
    }

    // Get images with annotations
    const result = await db.query(
      `SELECT 
        ei.*,
        json_agg(
          json_build_object(
            'id', a.id,
            'annotator_id', a.annotator_id,
            'lesion_id', a.lesion_id,
            'category', a.category,
            'bbox', a.bbox,
            'segmentation', a.segmentation,
            'paris_classification', a.paris_classification,
            'jnet_classification', a.jnet_classification,
            'kudo_pattern', a.kudo_pattern,
            'nice_classification', a.nice_classification,
            'forrest_classification', a.forrest_classification,
            'severity', a.severity,
            'confidence', a.confidence,
            'clinical_description', a.clinical_description
          )
        ) FILTER (WHERE a.id IS NOT NULL) as annotations
      FROM endoscopy_images ei
      LEFT JOIN annotations a ON ei.id = a.image_id
      ${whereClause}
      GROUP BY ei.id`,
      params
    );

    if (format === 'coco') {
      const cocoData = await generateCOCOFormat(result.rows);
      res.json(cocoData);
    } else if (format === 'jsonl') {
      const jsonlData = await generateJSONLFormat(result.rows);
      res.setHeader('Content-Type', 'application/x-ndjson');
      res.setHeader('Content-Disposition', `attachment; filename="dataset_${split}.jsonl"`);
      res.send(jsonlData);
    } else {
      throw new ApiError(400, 'Invalid export format');
    }
  } catch (error) {
    next(error);
  }
}

/**
 * Reassign dataset splits
 */
export async function reassignDatasetSplit(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { trainRatio = 0.8, valRatio = 0.1, testRatio = 0.1 } = req.body;

    // Validate ratios
    if (trainRatio + valRatio + testRatio !== 1) {
      throw new ApiError(400, 'Split ratios must sum to 1');
    }

    // Get all validated images grouped by category
    const categories = await db.query(
      `SELECT DISTINCT category 
       FROM endoscopy_images 
       WHERE validation_status = 'validated'`
    );

    let totalReassigned = 0;

    // Reassign splits for each category to ensure balanced distribution
    for (const category of categories.rows) {
      const images = await db.query(
        `SELECT id FROM endoscopy_images 
         WHERE validation_status = 'validated' AND category = $1
         ORDER BY RANDOM()`,
        [category.category]
      );

      const total = images.rows.length;
      const trainCount = Math.floor(total * trainRatio);
      const valCount = Math.floor(total * valRatio);

      // Assign splits
      for (let i = 0; i < images.rows.length; i++) {
        let split: string;
        if (i < trainCount) {
          split = 'train';
        } else if (i < trainCount + valCount) {
          split = 'val';
        } else {
          split = 'test';
        }

        await db.query(
          'UPDATE endoscopy_images SET dataset_split = $1 WHERE id = $2',
          [split, images.rows[i].id]
        );
        totalReassigned++;
      }
    }

    // Update data quality metrics
    await db.query(
      `INSERT INTO data_quality_metrics (
        dataset_version,
        total_images,
        images_per_category,
        annotation_coverage,
        age_distribution,
        sex_distribution,
        location_distribution
      )
      SELECT 
        'v' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD_HH24MI') as dataset_version,
        COUNT(*) as total_images,
        json_object_agg(category, category_count) as images_per_category,
        COUNT(DISTINCT a.image_id)::float / COUNT(DISTINCT ei.id) as annotation_coverage,
        json_object_agg(age_range, age_count) as age_distribution,
        json_object_agg(sex, sex_count) as sex_distribution,
        json_object_agg(location, location_count) as location_distribution
      FROM (
        SELECT category, COUNT(*) as category_count FROM endoscopy_images GROUP BY category
      ) cat_stats,
      (
        SELECT age_range, COUNT(*) as age_count FROM endoscopy_images GROUP BY age_range
      ) age_stats,
      (
        SELECT sex, COUNT(*) as sex_count FROM endoscopy_images GROUP BY sex
      ) sex_stats,
      (
        SELECT location, COUNT(*) as location_count FROM endoscopy_images GROUP BY location
      ) loc_stats,
      endoscopy_images ei
      LEFT JOIN annotations a ON ei.id = a.image_id`
    );

    res.json({
      success: true,
      message: `Successfully reassigned ${totalReassigned} images`,
      splits: {
        train: trainRatio,
        val: valRatio,
        test: testRatio,
      },
    });
  } catch (error) {
    next(error);
  }
}

// Helper functions

async function generateCOCOFormat(images: any[]): Promise<any> {
  const categories = [
    { id: 1, name: 'polyp', supercategory: 'lesion' },
    { id: 2, name: 'ulcer', supercategory: 'lesion' },
    { id: 3, name: 'erosion', supercategory: 'lesion' },
    { id: 4, name: 'bleeding', supercategory: 'lesion' },
    { id: 5, name: 'tumor', supercategory: 'lesion' },
    { id: 6, name: 'inflammation', supercategory: 'lesion' },
    { id: 7, name: 'normal', supercategory: 'normal' },
  ];

  const categoryMap = categories.reduce((map, cat) => {
    map[cat.name] = cat.id;
    return map;
  }, {} as Record<string, number>);

  const cocoImages: any[] = [];
  const cocoAnnotations: any[] = [];
  let annotationId = 1;

  for (const image of images) {
    cocoImages.push({
      id: image.id,
      file_name: `${image.id}.jpg`,
      width: 896,
      height: 896,
      metadata: {
        sex: image.sex,
        age_range: image.age_range,
        location: image.location,
        imaging_mode: image.imaging_mode,
        procedure_type: image.procedure_type,
      },
    });

    if (image.annotations) {
      for (const annotation of image.annotations) {
        const bbox = annotation.bbox;
        cocoAnnotations.push({
          id: annotationId++,
          image_id: image.id,
          category_id: categoryMap[annotation.category],
          bbox: [bbox.x, bbox.y, bbox.width, bbox.height],
          area: bbox.width * bbox.height,
          segmentation: annotation.segmentation || [],
          iscrowd: 0,
          attributes: {
            paris_classification: annotation.paris_classification,
            jnet_classification: annotation.jnet_classification,
            kudo_pattern: annotation.kudo_pattern,
            nice_classification: annotation.nice_classification,
            forrest_classification: annotation.forrest_classification,
            severity: annotation.severity,
            confidence: annotation.confidence,
          },
        });
      }
    }
  }

  return {
    info: {
      description: 'EGD/Colonoscopy AI Dataset',
      version: '1.0',
      year: new Date().getFullYear(),
      contributor: 'EGD/Colonoscopy AI Team',
      date_created: new Date().toISOString(),
    },
    licenses: [{
      id: 1,
      name: 'Private - Medical Data',
      url: '',
    }],
    categories,
    images: cocoImages,
    annotations: cocoAnnotations,
  };
}

async function generateJSONLFormat(images: any[]): Promise<string> {
  const jsonLines: string[] = [];

  for (const image of images) {
    const prompt = `Analyze this endoscopic image and identify any lesions or abnormalities. For each finding, describe:
1. The type of lesion (polyp, ulcer, erosion, bleeding, tumor, inflammation, or normal)
2. Its location and appearance
3. Relevant classification according to standard criteria (Paris, JNET, Kudo, NICE, or Forrest as applicable)
4. Clinical significance and recommended action`;

    const annotations = image.annotations || [];
    let response = '';

    if (annotations.length === 0 && image.category === 'normal') {
      response = 'Normal endoscopic findings. No lesions or abnormalities detected.';
    } else {
      const findings = annotations.map((ann: any, idx: number) => {
        let finding = `Finding ${idx + 1}: ${ann.category}`;
        
        if (ann.clinical_description) {
          finding += `\nDescription: ${ann.clinical_description}`;
        }
        
        if (ann.paris_classification) {
          finding += `\nParis Classification: ${ann.paris_classification}`;
        }
        
        if (ann.jnet_classification) {
          finding += `\nJNET Classification: ${ann.jnet_classification}`;
        }
        
        if (ann.severity) {
          finding += `\nSeverity: ${ann.severity}`;
        }
        
        if (ann.confidence) {
          finding += `\nConfidence: ${(ann.confidence * 100).toFixed(1)}%`;
        }
        
        return finding;
      }).join('\n\n');
      
      response = findings || `${image.category} detected. Location: ${image.location}`;
    }

    const jsonlEntry = {
      image_path: image.s3_path,
      prompt,
      response,
      metadata: {
        image_id: image.id,
        sex: image.sex,
        age_range: image.age_range,
        location: image.location,
        imaging_mode: image.imaging_mode,
        procedure_type: image.procedure_type,
        dataset_split: image.dataset_split,
      },
    };

    jsonLines.push(JSON.stringify(jsonlEntry));
  }

  return jsonLines.join('\n');
}