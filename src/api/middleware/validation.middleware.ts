import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

// Schema for endoscopy image upload
const uploadSchema = Joi.object({
  category: Joi.string()
    .valid('polyp', 'ulcer', 'erosion', 'bleeding', 'tumor', 'inflammation', 'normal')
    .required(),
  sex: Joi.string()
    .valid('M', 'F')
    .required(),
  ageRange: Joi.string()
    .valid('0-20', '21-40', '41-60', '61-80', '>80')
    .required(),
  location: Joi.string()
    .min(1)
    .max(100)
    .required(),
  boundingBox: Joi.object({
    x: Joi.number().min(0).required(),
    y: Joi.number().min(0).required(),
    width: Joi.number().min(1).required(),
    height: Joi.number().min(1).required(),
  }).required(),
  confidence: Joi.number()
    .min(0)
    .max(1)
    .required(),
  
  // Optional classifications
  parisClassification: Joi.string()
    .valid('0-Ip', '0-Is', '0-Isp', '0-IIa', '0-IIb', '0-IIc', '0-III')
    .optional(),
  jnetClassification: Joi.string()
    .valid('Type1', 'Type2A', 'Type2B', 'Type3')
    .optional(),
  kudoPitPattern: Joi.string()
    .valid('I', 'II', 'IIIS', 'IIIL', 'IV', 'Vi', 'Vn')
    .optional(),
  niceClassification: Joi.string()
    .valid('Type1', 'Type2', 'Type3')
    .optional(),
  forrestClassification: Joi.string()
    .valid('Ia', 'Ib', 'IIa', 'IIb', 'IIc', 'III')
    .optional(),
  
  // Optional metadata
  imagingMode: Joi.string()
    .valid('white-light', 'NBI', 'chromoendoscopy')
    .optional(),
  equipmentType: Joi.string()
    .max(100)
    .optional(),
  procedureType: Joi.string()
    .valid('EGD', 'colonoscopy')
    .optional(),
  additionalNotes: Joi.string()
    .max(1000)
    .optional(),
});

export function validateUploadRequest(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Parse JSON fields from multipart form data
  try {
    // If body fields are strings, parse them
    if (typeof req.body.boundingBox === 'string') {
      req.body.boundingBox = JSON.parse(req.body.boundingBox);
    }
    if (typeof req.body.confidence === 'string') {
      req.body.confidence = parseFloat(req.body.confidence);
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      errors: ['Invalid JSON format in request body'],
    });
    return;
  }

  const { error, value } = uploadSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map(detail => detail.message);
    res.status(400).json({
      success: false,
      errors,
    });
    return;
  }

  // Replace body with validated and cleaned data
  req.body = value;
  next();
}

// Schema for annotation
const annotationSchema = Joi.object({
  lesionId: Joi.number().integer().min(0).required(),
  category: Joi.string()
    .valid('polyp', 'ulcer', 'erosion', 'bleeding', 'tumor', 'inflammation', 'normal')
    .required(),
  bbox: Joi.object({
    x: Joi.number().min(0).required(),
    y: Joi.number().min(0).required(),
    width: Joi.number().min(1).required(),
    height: Joi.number().min(1).required(),
  }).required(),
  segmentation: Joi.array()
    .items(Joi.array().items(Joi.number()))
    .optional(),
  
  // Optional classifications
  parisClassification: Joi.string()
    .valid('0-Ip', '0-Is', '0-Isp', '0-IIa', '0-IIb', '0-IIc', '0-III')
    .optional(),
  jnetClassification: Joi.string()
    .valid('Type1', 'Type2A', 'Type2B', 'Type3')
    .optional(),
  kudoPitPattern: Joi.string()
    .valid('I', 'II', 'IIIS', 'IIIL', 'IV', 'Vi', 'Vn')
    .optional(),
  niceClassification: Joi.string()
    .valid('Type1', 'Type2', 'Type3')
    .optional(),
  forrestClassification: Joi.string()
    .valid('Ia', 'Ib', 'IIa', 'IIb', 'IIc', 'III')
    .optional(),
  
  // Additional attributes
  severity: Joi.string()
    .valid('mild', 'moderate', 'severe')
    .optional(),
  confidence: Joi.number()
    .min(0)
    .max(1)
    .optional(),
  clinicalDescription: Joi.string()
    .max(2000)
    .optional(),
});

export function validateAnnotationRequest(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { error, value } = annotationSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map(detail => detail.message);
    res.status(400).json({
      success: false,
      errors,
    });
    return;
  }

  req.body = value;
  next();
}