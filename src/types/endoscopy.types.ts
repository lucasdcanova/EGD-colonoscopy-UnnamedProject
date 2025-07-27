// Type definitions for endoscopy image annotations and classifications

export type LesionCategory = 'polyp' | 'ulcer' | 'erosion' | 'bleeding' | 'tumor' | 'inflammation' | 'normal';
export type Sex = 'M' | 'F';
export type AgeRange = '0-20' | '21-40' | '41-60' | '61-80' | '>80';
export type ImagingMode = 'white-light' | 'NBI' | 'chromoendoscopy';
export type ProcedureType = 'EGD' | 'colonoscopy';
export type ValidationStatus = 'pending' | 'validated' | 'rejected' | 'needs_review';
export type DatasetSplit = 'train' | 'val' | 'test';
export type Severity = 'mild' | 'moderate' | 'severe';

// Paris Classification for superficial lesions
export type ParisClassification = 
  | '0-Ip' | '0-Is' | '0-Isp'  // Polypoid
  | '0-IIa' | '0-IIb' | '0-IIc' // Non-polypoid
  | '0-III'; // Excavated

// JNET Classification (NBI vascular pattern)
export type JNETClassification = 
  | 'Type1'   // Hyperplastic
  | 'Type2A'  // Low-grade adenoma
  | 'Type2B'  // High-grade adenoma/superficial carcinoma
  | 'Type3';  // Deep submucosal invasive carcinoma

// Kudo Pit Pattern
export type KudoPitPattern = 
  | 'I'     // Normal
  | 'II'    // Stellar/papillary
  | 'IIIS'  // Small tubular
  | 'IIIL'  // Large tubular
  | 'IV'    // Branch-like/gyrus-like
  | 'Vi'    // Irregular
  | 'Vn';   // Non-structural

// NICE Classification (NBI International Colorectal Endoscopic)
export type NICEClassification = 
  | 'Type1'  // Hyperplastic
  | 'Type2'  // Adenoma
  | 'Type3'; // Deep submucosal invasive carcinoma

// Forrest Classification for bleeding ulcers
export type ForrestClassification = 
  | 'Ia'   // Active arterial bleeding
  | 'Ib'   // Active venous bleeding
  | 'IIa'  // Non-bleeding visible vessel
  | 'IIb'  // Adherent clot
  | 'IIc'  // Hematin on ulcer base
  | 'III'; // Clean ulcer base

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EndoscopyImageUpload {
  // Required fields
  image: Buffer | string; // Base64 or buffer
  category: LesionCategory;
  sex: Sex;
  ageRange: AgeRange;
  location: string;
  boundingBox: BoundingBox;
  confidence: number;

  // Optional classification systems
  parisClassification?: ParisClassification;
  jnetClassification?: JNETClassification;
  kudoPitPattern?: KudoPitPattern;
  niceClassification?: NICEClassification;
  forrestClassification?: ForrestClassification;

  // Optional metadata
  imagingMode?: ImagingMode;
  equipmentType?: string;
  procedureType?: ProcedureType;
  additionalNotes?: string;
}

export interface EndoscopyImage extends EndoscopyImageUpload {
  id: string;
  imageHash: string;
  s3Path: string;
  s3Region: string;
  isAnonymized: boolean;
  validationStatus: ValidationStatus;
  datasetSplit?: DatasetSplit;
  qualityScore?: number;
  uploadDate: Date;
  processedDate?: Date;
  annotationDate?: Date;
  lastModified: Date;
}

export interface Annotation {
  id: string;
  imageId: string;
  annotatorId: string;
  annotationType: string;
  lesionId: number;
  category: LesionCategory;
  bbox: BoundingBox;
  segmentation?: number[][]; // Polygon points
  
  // Classifications
  parisClassification?: ParisClassification;
  jnetClassification?: JNETClassification;
  kudoPitPattern?: KudoPitPattern;
  niceClassification?: NICEClassification;
  forrestClassification?: ForrestClassification;
  
  // Additional attributes
  severity?: Severity;
  confidence?: number;
  clinicalDescription?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface ModelPrediction {
  id: string;
  imageId: string;
  modelVersion: string;
  predictions: {
    category: LesionCategory;
    bbox: BoundingBox;
    confidence: number;
    classifications?: {
      paris?: ParisClassification;
      jnet?: JNETClassification;
      kudo?: KudoPitPattern;
      nice?: NICEClassification;
      forrest?: ForrestClassification;
    };
    clinicalDescription?: string;
    recommendedAction?: 'monitor' | 'biopsy' | 'urgent';
  }[];
  rawOutput: string;
  inferenceTimeMs: number;
  modelConfig?: Record<string, any>;
  temperature?: number;
  topK?: number;
  topP?: number;
  createdAt: Date;
}

export interface ProcessingLog {
  id: string;
  imageId: string;
  step: string;
  status: 'started' | 'completed' | 'failed' | 'skipped';
  message?: string;
  errorDetails?: Record<string, any>;
  durationMs?: number;
  memoryUsedMb?: number;
  startedAt: Date;
  completedAt?: Date;
}

export interface Annotator {
  id: string;
  specialty: string;
  yearsExperience?: number;
  certificationLevel?: string;
  totalAnnotations: number;
  agreementScore?: number;
  createdAt: Date;
  lastActive: Date;
}

export interface DataQualityMetrics {
  id: string;
  datasetVersion: string;
  totalImages: number;
  imagesPerCategory: Record<LesionCategory, number>;
  avgImageQuality?: number;
  annotationCoverage: number;
  interAnnotatorAgreement?: number;
  ageDistribution: Record<AgeRange, number>;
  sexDistribution: Record<Sex, number>;
  locationDistribution: Record<string, number>;
  calculatedAt: Date;
}

// API Request/Response types
export interface UploadImageRequest {
  image: string; // Base64 encoded
  metadata: Omit<EndoscopyImageUpload, 'image'>;
}

export interface UploadImageResponse {
  success: boolean;
  imageId?: string;
  s3Path?: string;
  errors?: string[];
  warnings?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions?: string[];
}

export interface AnonymizationResult {
  success: boolean;
  anonymizedImagePath?: string;
  removedMetadata?: string[];
  errors?: string[];
}