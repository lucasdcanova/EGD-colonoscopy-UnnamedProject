export type LesionCategory = 'polyp' | 'ulcer' | 'erosion' | 'bleeding' | 'tumor' | 'inflammation' | 'normal';
export type Sex = 'M' | 'F';
export type AgeRange = '0-20' | '21-40' | '41-60' | '61-80' | '>80';
export type ImagingMode = 'white-light' | 'NBI' | 'chromoendoscopy';
export type ProcedureType = 'EGD' | 'colonoscopy';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageUploadData {
  // Required
  category: LesionCategory;
  sex: Sex;
  ageRange: AgeRange;
  location: string;
  boundingBox: BoundingBox;
  confidence: number;
  lesionSize: number; // Size in mm

  // Optional classifications
  parisClassification?: string;
  jnetClassification?: string;
  kudoPitPattern?: string;
  niceClassification?: string;
  forrestClassification?: string;

  // Optional metadata
  imagingMode?: ImagingMode;
  equipmentType?: string;
  procedureType?: ProcedureType;
  additionalNotes?: string;
}

export interface Annotation {
  id: string;
  imageId: string;
  annotatorId: string;
  lesionId: number;
  category: LesionCategory;
  bbox: BoundingBox;
  segmentation?: number[][];
  
  // Classifications
  parisClassification?: string;
  jnetClassification?: string;
  kudoPitPattern?: string;
  niceClassification?: string;
  forrestClassification?: string;
  
  // Additional
  severity?: 'mild' | 'moderate' | 'severe';
  confidence?: number;
  clinicalDescription?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface EndoscopyImage {
  id: string;
  imageHash: string;
  s3Path: string;
  category: LesionCategory;
  sex: Sex;
  ageRange: AgeRange;
  location: string;
  boundingBox: BoundingBox;
  confidence: number;
  validationStatus: string;
  datasetSplit?: string;
  uploadDate: string;
}

export const PARIS_CLASSIFICATIONS = [
  { value: '0-Ip', label: '0-Ip - Pediculado' },
  { value: '0-Is', label: '0-Is - Séssil' },
  { value: '0-Isp', label: '0-Isp - Sub-pediculado' },
  { value: '0-IIa', label: '0-IIa - Elevado' },
  { value: '0-IIb', label: '0-IIb - Plano' },
  { value: '0-IIc', label: '0-IIc - Deprimido' },
  { value: '0-III', label: '0-III - Escavado' },
];

export const JNET_CLASSIFICATIONS = [
  { value: 'Type1', label: 'Type 1 - Hiperplásico' },
  { value: 'Type2A', label: 'Type 2A - Adenoma baixo grau' },
  { value: 'Type2B', label: 'Type 2B - Adenoma alto grau/Ca superficial' },
  { value: 'Type3', label: 'Type 3 - Carcinoma invasivo' },
];

export const KUDO_PATTERNS = [
  { value: 'I', label: 'I - Normal' },
  { value: 'II', label: 'II - Estrelado/papilar' },
  { value: 'IIIS', label: 'IIIS - Tubular pequeno' },
  { value: 'IIIL', label: 'IIIL - Tubular grande' },
  { value: 'IV', label: 'IV - Ramificado/giriforme' },
  { value: 'Vi', label: 'Vi - Irregular' },
  { value: 'Vn', label: 'Vn - Amorfo' },
];

export const NICE_CLASSIFICATIONS = [
  { value: 'Type1', label: 'Type 1 - Hiperplásico' },
  { value: 'Type2', label: 'Type 2 - Adenoma' },
  { value: 'Type3', label: 'Type 3 - Carcinoma invasivo' },
];

export const FORREST_CLASSIFICATIONS = [
  { value: 'Ia', label: 'Ia - Sangramento arterial ativo' },
  { value: 'Ib', label: 'Ib - Sangramento venoso ativo' },
  { value: 'IIa', label: 'IIa - Vaso visível não sangrante' },
  { value: 'IIb', label: 'IIb - Coágulo aderente' },
  { value: 'IIc', label: 'IIc - Hematina na base' },
  { value: 'III', label: 'III - Base limpa' },
];