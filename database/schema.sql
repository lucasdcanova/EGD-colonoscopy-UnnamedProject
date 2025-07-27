-- Schema for EGD/Colonoscopy AI Project
-- Database: Neon PostgreSQL (São Paulo region)
-- Compliance: LGPD + HIPAA

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Main table for endoscopic images
CREATE TABLE endoscopy_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    image_hash VARCHAR(64) UNIQUE NOT NULL,
    s3_path VARCHAR(255) NOT NULL,
    s3_region VARCHAR(20) DEFAULT 'us-east-1',
    
    -- Required fields
    category VARCHAR(20) NOT NULL CHECK (category IN ('polyp', 'ulcer', 'erosion', 'bleeding', 'tumor', 'inflammation', 'normal')),
    sex CHAR(1) NOT NULL CHECK (sex IN ('M', 'F')),
    age_range VARCHAR(10) NOT NULL CHECK (age_range IN ('0-20', '21-40', '41-60', '61-80', '>80')),
    location VARCHAR(50) NOT NULL,
    bbox JSONB NOT NULL, -- Format: {x: number, y: number, width: number, height: number}
    confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    
    -- Optional classification systems
    paris_classification VARCHAR(10),
    jnet_classification VARCHAR(10),
    kudo_pattern VARCHAR(10),
    nice_classification VARCHAR(10),
    forrest_classification VARCHAR(10),
    
    -- Metadata
    imaging_mode VARCHAR(20) DEFAULT 'white-light' CHECK (imaging_mode IN ('white-light', 'NBI', 'chromoendoscopy')),
    equipment_type VARCHAR(50),
    procedure_type VARCHAR(20) CHECK (procedure_type IN ('EGD', 'colonoscopy')),
    
    -- Timestamps and tracking
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_date TIMESTAMP WITH TIME ZONE,
    annotation_date TIMESTAMP WITH TIME ZONE,
    last_modified TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Data split assignment
    dataset_split VARCHAR(10) CHECK (dataset_split IN ('train', 'val', 'test')),
    
    -- Quality control
    is_anonymized BOOLEAN DEFAULT FALSE,
    validation_status VARCHAR(20) DEFAULT 'pending' CHECK (validation_status IN ('pending', 'validated', 'rejected', 'needs_review')),
    quality_score FLOAT,
    
    -- Indexing for performance
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing multiple annotations per image
CREATE TABLE annotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    image_id UUID NOT NULL REFERENCES endoscopy_images(id) ON DELETE CASCADE,
    annotator_id UUID NOT NULL,
    annotation_type VARCHAR(20) NOT NULL,
    
    -- Lesion details
    lesion_id INTEGER NOT NULL, -- Multiple lesions per image
    category VARCHAR(20) NOT NULL,
    bbox JSONB NOT NULL,
    segmentation JSONB, -- Optional polygon points
    
    -- Classification details
    paris_classification VARCHAR(10),
    jnet_classification VARCHAR(10),
    kudo_pattern VARCHAR(10),
    nice_classification VARCHAR(10),
    forrest_classification VARCHAR(10),
    
    -- Additional attributes
    severity VARCHAR(20) CHECK (severity IN ('mild', 'moderate', 'severe')),
    confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
    clinical_description TEXT,
    
    -- Tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique lesion ID per image per annotator
    UNIQUE(image_id, annotator_id, lesion_id)
);

-- Table for model predictions
CREATE TABLE model_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    image_id UUID NOT NULL REFERENCES endoscopy_images(id) ON DELETE CASCADE,
    model_version VARCHAR(50) NOT NULL,
    
    -- Prediction details
    predictions JSONB NOT NULL, -- Array of predictions
    raw_output TEXT, -- Full model output
    inference_time_ms INTEGER,
    
    -- Model metadata
    model_config JSONB,
    temperature FLOAT,
    top_k INTEGER,
    top_p FLOAT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Index for fast lookups
    INDEX idx_model_predictions_image_id (image_id),
    INDEX idx_model_predictions_model_version (model_version)
);

-- Table for processing logs
CREATE TABLE processing_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    image_id UUID NOT NULL REFERENCES endoscopy_images(id) ON DELETE CASCADE,
    
    -- Processing details
    step VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'skipped')),
    message TEXT,
    error_details JSONB,
    
    -- Performance metrics
    duration_ms INTEGER,
    memory_used_mb INTEGER,
    
    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Index for fast lookups
    INDEX idx_processing_logs_image_id (image_id),
    INDEX idx_processing_logs_status (status)
);

-- Table for annotators (medical professionals)
CREATE TABLE annotators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Anonymized professional info
    specialty VARCHAR(50) NOT NULL,
    years_experience INTEGER,
    certification_level VARCHAR(50),
    
    -- Performance tracking
    total_annotations INTEGER DEFAULT 0,
    agreement_score FLOAT, -- Inter-rater reliability
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for data quality metrics
CREATE TABLE data_quality_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Dataset statistics
    dataset_version VARCHAR(20) NOT NULL,
    total_images INTEGER NOT NULL,
    images_per_category JSONB NOT NULL,
    
    -- Quality metrics
    avg_image_quality FLOAT,
    annotation_coverage FLOAT, -- Percentage of images with annotations
    inter_annotator_agreement FLOAT,
    
    -- Distribution stats
    age_distribution JSONB,
    sex_distribution JSONB,
    location_distribution JSONB,
    
    -- Timestamps
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one entry per version
    UNIQUE(dataset_version)
);

-- Create indexes for performance
CREATE INDEX idx_endoscopy_images_hash ON endoscopy_images(image_hash);
CREATE INDEX idx_endoscopy_images_category ON endoscopy_images(category);
CREATE INDEX idx_endoscopy_images_dataset_split ON endoscopy_images(dataset_split);
CREATE INDEX idx_endoscopy_images_validation_status ON endoscopy_images(validation_status);
CREATE INDEX idx_endoscopy_images_processed_date ON endoscopy_images(processed_date);
CREATE INDEX idx_annotations_image_id ON annotations(image_id);
CREATE INDEX idx_annotations_annotator_id ON annotations(annotator_id);

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_endoscopy_images_updated_at BEFORE UPDATE
    ON endoscopy_images FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_annotations_updated_at BEFORE UPDATE
    ON annotations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for dataset statistics
CREATE VIEW dataset_statistics AS
SELECT 
    dataset_split,
    category,
    COUNT(*) as count,
    AVG(confidence) as avg_confidence,
    COUNT(DISTINCT age_range) as age_range_diversity,
    COUNT(DISTINCT location) as location_diversity
FROM endoscopy_images
WHERE validation_status = 'validated'
GROUP BY dataset_split, category;

-- Create view for annotation progress
CREATE VIEW annotation_progress AS
SELECT 
    ei.id,
    ei.image_hash,
    ei.category,
    ei.upload_date,
    COUNT(DISTINCT a.annotator_id) as num_annotators,
    COUNT(a.id) as total_annotations,
    MAX(a.created_at) as last_annotation_date
FROM endoscopy_images ei
LEFT JOIN annotations a ON ei.id = a.image_id
GROUP BY ei.id, ei.image_hash, ei.category, ei.upload_date;