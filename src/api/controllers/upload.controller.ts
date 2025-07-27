import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { MCPClient } from '../../utils/mcp-client';
import { db } from '../../utils/database';
import { 
  EndoscopyImageUpload, 
  UploadImageResponse, 
  ValidationResult,
  ProcessingLog 
} from '../../types/endoscopy.types';

// Initialize AWS S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
});

// Initialize MCP client
const mcpClient = new MCPClient();

/**
 * Upload and process an endoscopy image
 */
export async function uploadImage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        errors: ['No image file provided'],
      });
      return;
    }

    const imageId = uuidv4();
    const imageBuffer = req.file.buffer;
    const metadata: EndoscopyImageUpload = req.body;

    // Start processing log
    await logProcessingStep(imageId, 'upload_started', 'started');

    // Step 1: Validate image using MCP
    const validationResult = await validateImageWithMCP(imageBuffer, metadata);
    if (!validationResult.isValid) {
      await logProcessingStep(imageId, 'validation', 'failed', validationResult.errors.join(', '));
      res.status(400).json({
        success: false,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
      });
      return;
    }
    await logProcessingStep(imageId, 'validation', 'completed');

    // Step 2: Check compliance using MCP
    const complianceCheck = await mcpClient.checkCompliance({
      checkType: 'image',
      imagePath: imageBuffer,
    });
    if (!complianceCheck.compliant) {
      await logProcessingStep(imageId, 'compliance_check', 'failed', complianceCheck.issues.join(', '));
      res.status(400).json({
        success: false,
        errors: complianceCheck.issues,
      });
      return;
    }
    await logProcessingStep(imageId, 'compliance_check', 'completed');

    // Step 3: Anonymize image using MCP
    const anonymizationResult = await mcpClient.anonymizeData({
      imageData: imageBuffer,
      anonymizationLevel: 'moderate',
    });
    if (!anonymizationResult.success) {
      await logProcessingStep(imageId, 'anonymization', 'failed');
      res.status(500).json({
        success: false,
        errors: ['Failed to anonymize image'],
      });
      return;
    }
    await logProcessingStep(imageId, 'anonymization', 'completed');

    // Step 4: Process image (resize to 896x896)
    const processedImage = await processImage(anonymizationResult.anonymizedImage);
    await logProcessingStep(imageId, 'image_processing', 'completed');

    // Step 5: Generate hash for deduplication
    const imageHash = generateImageHash(processedImage);

    // Check for duplicate
    const existingImage = await db.query(
      'SELECT id FROM endoscopy_images WHERE image_hash = $1',
      [imageHash]
    );
    if (existingImage.rows.length > 0) {
      await logProcessingStep(imageId, 'duplicate_check', 'failed', 'Duplicate image detected');
      res.status(409).json({
        success: false,
        errors: ['This image has already been uploaded'],
        imageId: existingImage.rows[0].id,
      });
      return;
    }

    // Step 6: Upload to S3
    const s3Key = `endoscopy-images/${metadata.procedureType || 'general'}/${imageId}.jpg`;
    await uploadToS3(processedImage, s3Key);
    await logProcessingStep(imageId, 'upload_to_s3', 'completed');

    // Step 7: Save metadata to database
    await saveImageMetadata(imageId, imageHash, s3Key, metadata);
    await logProcessingStep(imageId, 'save_metadata', 'completed');

    // Step 8: Assign to dataset split
    const datasetSplit = assignDatasetSplit();
    await db.query(
      'UPDATE endoscopy_images SET dataset_split = $1 WHERE id = $2',
      [datasetSplit, imageId]
    );
    await logProcessingStep(imageId, 'dataset_assignment', 'completed');

    // Mark upload as completed
    await logProcessingStep(imageId, 'upload_completed', 'completed');

    const response: UploadImageResponse = {
      success: true,
      imageId,
      s3Path: s3Key,
      warnings: validationResult.warnings,
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * Validate image without uploading
 */
export async function validateImageUpload(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        errors: ['No image file provided'],
      });
      return;
    }

    const imageBuffer = req.file.buffer;
    const metadata: EndoscopyImageUpload = req.body;

    const validationResult = await validateImageWithMCP(imageBuffer, metadata);
    
    res.json({
      success: validationResult.isValid,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
      suggestions: validationResult.suggestions,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get upload processing status
 */
export async function getUploadStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { imageId } = req.params;

    const result = await db.query(
      `SELECT 
        ei.id,
        ei.validation_status,
        ei.is_anonymized,
        ei.dataset_split,
        ei.created_at,
        json_agg(
          json_build_object(
            'step', pl.step,
            'status', pl.status,
            'message', pl.message,
            'started_at', pl.started_at,
            'completed_at', pl.completed_at
          ) ORDER BY pl.started_at
        ) as processing_steps
      FROM endoscopy_images ei
      LEFT JOIN processing_logs pl ON ei.id = pl.image_id
      WHERE ei.id = $1
      GROUP BY ei.id`,
      [imageId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        error: 'Image not found',
      });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
}

// Helper functions

async function validateImageWithMCP(
  imageBuffer: Buffer,
  metadata: EndoscopyImageUpload
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Validate using MCP tool
  try {
    const mcpValidation = await mcpClient.validateEndoscopyImage({
      imageData: imageBuffer,
      checkContent: true,
    });

    if (!mcpValidation.isValid) {
      errors.push(...mcpValidation.errors);
    }
    if (mcpValidation.warnings) {
      warnings.push(...mcpValidation.warnings);
    }
  } catch (error) {
    errors.push('Failed to validate image with MCP');
  }

  // Validate metadata
  if (!metadata.category || !metadata.sex || !metadata.ageRange) {
    errors.push('Required metadata fields are missing');
  }

  if (!metadata.boundingBox || 
      typeof metadata.boundingBox.x !== 'number' ||
      typeof metadata.boundingBox.y !== 'number' ||
      typeof metadata.boundingBox.width !== 'number' ||
      typeof metadata.boundingBox.height !== 'number') {
    errors.push('Invalid bounding box format');
  }

  if (metadata.confidence < 0 || metadata.confidence > 1) {
    errors.push('Confidence must be between 0 and 1');
  }

  // Validate optional classifications
  if (metadata.parisClassification && !isValidParisClassification(metadata.parisClassification)) {
    warnings.push('Invalid Paris classification');
  }

  if (metadata.jnetClassification && !isValidJNETClassification(metadata.jnetClassification)) {
    warnings.push('Invalid JNET classification');
  }

  // Add suggestions for missing optional fields
  if (!metadata.parisClassification && metadata.category === 'polyp') {
    suggestions.push('Consider adding Paris classification for polyp');
  }

  if (!metadata.imagingMode) {
    suggestions.push('Specify imaging mode (white-light, NBI, or chromoendoscopy)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

async function processImage(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .resize(896, 896, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0 },
    })
    .jpeg({ quality: 95 })
    .toBuffer();
}

function generateImageHash(imageBuffer: Buffer): string {
  return crypto.createHash('sha256').update(imageBuffer).digest('hex');
}

async function uploadToS3(imageBuffer: Buffer, key: string): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME || 'egd-endoscopia-images',
    Key: key,
    Body: imageBuffer,
    ContentType: 'image/jpeg',
    ServerSideEncryption: 'AES256',
  });

  await s3Client.send(command);
}

async function saveImageMetadata(
  imageId: string,
  imageHash: string,
  s3Path: string,
  metadata: EndoscopyImageUpload
): Promise<void> {
  await db.query(
    `INSERT INTO endoscopy_images (
      id, image_hash, s3_path, category, sex, age_range, location,
      bbox, confidence, paris_classification, jnet_classification,
      kudo_pattern, nice_classification, forrest_classification,
      imaging_mode, equipment_type, procedure_type, is_anonymized
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
    [
      imageId, imageHash, s3Path, metadata.category, metadata.sex,
      metadata.ageRange, metadata.location, JSON.stringify(metadata.boundingBox),
      metadata.confidence, metadata.parisClassification || null,
      metadata.jnetClassification || null, metadata.kudoPitPattern || null,
      metadata.niceClassification || null, metadata.forrestClassification || null,
      metadata.imagingMode || 'white-light', metadata.equipmentType || null,
      metadata.procedureType || null, true
    ]
  );
}

async function logProcessingStep(
  imageId: string,
  step: string,
  status: ProcessingLog['status'],
  message?: string
): Promise<void> {
  await db.query(
    `INSERT INTO processing_logs (image_id, step, status, message)
     VALUES ($1, $2, $3, $4)`,
    [imageId, step, status, message || null]
  );
}

function assignDatasetSplit(): 'train' | 'val' | 'test' {
  const random = Math.random();
  if (random < 0.8) return 'train';
  if (random < 0.9) return 'val';
  return 'test';
}

// Validation helpers
function isValidParisClassification(value: string): boolean {
  const validValues = ['0-Ip', '0-Is', '0-Isp', '0-IIa', '0-IIb', '0-IIc', '0-III'];
  return validValues.includes(value);
}

function isValidJNETClassification(value: string): boolean {
  const validValues = ['Type1', 'Type2A', 'Type2B', 'Type3'];
  return validValues.includes(value);
}