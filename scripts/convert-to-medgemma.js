#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Generate MedGemma-compatible prompt for endoscopy image
 */
function generatePrompt(imageData) {
  return `<start_of_turn>user
<image>
Analyze this endoscopic image and provide a detailed clinical assessment. Include:
1. Identification of any lesions or abnormalities
2. Classification according to relevant criteria (Paris, JNET, Kudo, NICE, or Forrest)
3. Location and characteristics
4. Clinical significance
5. Recommended follow-up actions
<end_of_turn>
<start_of_turn>model`;
}

/**
 * Generate response based on annotations
 */
function generateResponse(imageData, annotations) {
  if (!annotations || annotations.length === 0) {
    if (imageData.category === 'normal') {
      return `Normal endoscopic findings. No lesions or abnormalities detected in the ${imageData.location}. The mucosa appears healthy with normal vascular pattern and no signs of inflammation, ulceration, or neoplastic changes.

Recommendation: Continue routine surveillance as per standard guidelines.`;
    }
  }

  // Group annotations by lesion
  const lesionGroups = {};
  annotations.forEach(ann => {
    if (!lesionGroups[ann.lesion_id]) {
      lesionGroups[ann.lesion_id] = [];
    }
    lesionGroups[ann.lesion_id].push(ann);
  });

  let response = `Clinical Assessment:\n\n`;
  let lesionCount = 0;

  for (const [lesionId, lesionAnnotations] of Object.entries(lesionGroups)) {
    lesionCount++;
    const ann = lesionAnnotations[0]; // Use first annotation as primary
    
    response += `**Finding ${lesionCount}:**\n`;
    response += `- Type: ${capitalizeFirst(ann.category)}\n`;
    response += `- Location: ${imageData.location}\n`;
    
    // Add classifications if available
    if (ann.paris_classification) {
      response += `- Paris Classification: ${ann.paris_classification}\n`;
    }
    if (ann.jnet_classification) {
      response += `- JNET Classification: ${ann.jnet_classification}\n`;
    }
    if (ann.kudo_pattern) {
      response += `- Kudo Pit Pattern: ${ann.kudo_pattern}\n`;
    }
    if (ann.nice_classification) {
      response += `- NICE Classification: ${ann.nice_classification}\n`;
    }
    if (ann.forrest_classification) {
      response += `- Forrest Classification: ${ann.forrest_classification}\n`;
    }
    
    if (ann.severity) {
      response += `- Severity: ${capitalizeFirst(ann.severity)}\n`;
    }
    
    if (ann.clinical_description) {
      response += `- Description: ${ann.clinical_description}\n`;
    }
    
    // Add recommendations based on findings
    response += `- Recommendation: ${getRecommendation(ann)}\n\n`;
  }

  // Add overall assessment
  response += generateOverallAssessment(imageData, annotations);

  return response;
}

/**
 * Get recommendation based on lesion type and classifications
 */
function getRecommendation(annotation) {
  const { category, paris_classification, jnet_classification, nice_classification } = annotation;
  
  // High-risk features
  if (jnet_classification === 'Type3' || nice_classification === 'Type3') {
    return 'Urgent endoscopic resection or surgical referral recommended. High suspicion for invasive carcinoma.';
  }
  
  if (jnet_classification === 'Type2B') {
    return 'Endoscopic resection recommended. Features suggest high-grade dysplasia or superficial carcinoma.';
  }
  
  // Category-specific recommendations
  switch (category) {
    case 'polyp':
      if (paris_classification?.startsWith('0-I')) {
        return 'Endoscopic polypectomy recommended. Send specimen for histopathological examination.';
      }
      return 'Consider endoscopic resection based on size and appearance.';
      
    case 'ulcer':
      return 'Biopsy recommended to exclude malignancy. Consider H. pylori testing. Follow-up endoscopy in 6-8 weeks.';
      
    case 'bleeding':
      if (annotation.forrest_classification === 'Ia' || annotation.forrest_classification === 'Ib') {
        return 'Immediate endoscopic hemostasis required. Consider ICU admission.';
      }
      return 'Monitor closely. Consider prophylactic endoscopic therapy for high-risk stigmata.';
      
    case 'tumor':
      return 'Multiple biopsies recommended. Staging with CT/EUS if malignancy confirmed.';
      
    case 'inflammation':
      return 'Biopsies recommended to determine etiology. Consider IBD workup if appropriate.';
      
    case 'erosion':
      return 'Conservative management. PPI therapy and follow-up as clinically indicated.';
      
    default:
      return 'Clinical correlation recommended.';
  }
}

/**
 * Generate overall assessment
 */
function generateOverallAssessment(imageData, annotations) {
  const categories = [...new Set(annotations.map(a => a.category))];
  const hasHighRisk = annotations.some(a => 
    a.jnet_classification === 'Type3' || 
    a.nice_classification === 'Type3' ||
    a.category === 'tumor'
  );
  
  let assessment = '**Overall Assessment:**\n';
  
  if (hasHighRisk) {
    assessment += 'High-risk features identified requiring urgent intervention. ';
  } else if (categories.includes('polyp') || categories.includes('ulcer')) {
    assessment += 'Significant pathology identified requiring therapeutic intervention. ';
  } else {
    assessment += 'Mild to moderate pathology identified. ';
  }
  
  // Add demographic risk factors
  if (imageData.age_range === '61-80' || imageData.age_range === '>80') {
    assessment += 'Patient in high-risk age group for colorectal neoplasia. ';
  }
  
  assessment += '\n\n**Quality Metrics:**\n';
  assessment += `- Image quality: Good\n`;
  assessment += `- Visualization: Complete\n`;
  assessment += `- Confidence level: ${(imageData.confidence * 100).toFixed(0)}%`;
  
  return assessment;
}

/**
 * Capitalize first letter
 */
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Main conversion function
 */
async function convertToMedGemma(outputDir, split = 'all') {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting MedGemma format conversion...');
    
    // Create output directory
    await fs.mkdir(outputDir, { recursive: true });
    
    // Query for images with annotations
    let query = `
      SELECT 
        ei.*,
        json_agg(
          json_build_object(
            'id', a.id,
            'lesion_id', a.lesion_id,
            'category', a.category,
            'bbox', a.bbox,
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
      WHERE ei.validation_status = 'validated'
    `;
    
    const params = [];
    if (split !== 'all') {
      query += ' AND ei.dataset_split = $1';
      params.push(split);
    }
    
    query += ' GROUP BY ei.id ORDER BY ei.created_at';
    
    const result = await client.query(query, params);
    
    console.log(`📊 Found ${result.rows.length} images to convert`);
    
    // Convert each image
    const jsonlLines = [];
    
    for (const image of result.rows) {
      const prompt = generatePrompt(image);
      const response = generateResponse(image, image.annotations);
      
      const medgemmaEntry = {
        image_path: image.s3_path,
        image_id: image.id,
        prompt: prompt,
        response: response,
        metadata: {
          category: image.category,
          sex: image.sex,
          age_range: image.age_range,
          location: image.location,
          imaging_mode: image.imaging_mode || 'white-light',
          procedure_type: image.procedure_type,
          dataset_split: image.dataset_split,
          confidence: image.confidence,
          has_annotations: image.annotations !== null,
          num_lesions: image.annotations ? new Set(image.annotations.map(a => a.lesion_id)).size : 0
        }
      };
      
      jsonlLines.push(JSON.stringify(medgemmaEntry));
    }
    
    // Write JSONL file
    const filename = `medgemma_dataset_${split}_${new Date().toISOString().split('T')[0]}.jsonl`;
    const filepath = path.join(outputDir, filename);
    await fs.writeFile(filepath, jsonlLines.join('\n'));
    
    console.log(`✅ Successfully converted ${jsonlLines.length} entries`);
    console.log(`📄 Output saved to: ${filepath}`);
    
    // Generate statistics
    const stats = {
      total_images: result.rows.length,
      images_with_annotations: result.rows.filter(r => r.annotations).length,
      category_distribution: {},
      classification_usage: {
        paris: 0,
        jnet: 0,
        kudo: 0,
        nice: 0,
        forrest: 0
      }
    };
    
    result.rows.forEach(image => {
      stats.category_distribution[image.category] = (stats.category_distribution[image.category] || 0) + 1;
      
      if (image.annotations) {
        image.annotations.forEach(ann => {
          if (ann.paris_classification) stats.classification_usage.paris++;
          if (ann.jnet_classification) stats.classification_usage.jnet++;
          if (ann.kudo_pattern) stats.classification_usage.kudo++;
          if (ann.nice_classification) stats.classification_usage.nice++;
          if (ann.forrest_classification) stats.classification_usage.forrest++;
        });
      }
    });
    
    // Write statistics
    const statsFilepath = path.join(outputDir, `medgemma_stats_${split}.json`);
    await fs.writeFile(statsFilepath, JSON.stringify(stats, null, 2));
    
    console.log(`\n📊 Dataset Statistics:`);
    console.log(`   Total images: ${stats.total_images}`);
    console.log(`   Images with annotations: ${stats.images_with_annotations}`);
    console.log(`   Category distribution:`, stats.category_distribution);
    console.log(`   Classification usage:`, stats.classification_usage);
    
  } catch (error) {
    console.error('❌ Conversion failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const outputDir = args[0] || './data/medgemma_format';
const split = args[1] || 'all';

if (!['all', 'train', 'val', 'test'].includes(split)) {
  console.error('Invalid split. Use: all, train, val, or test');
  process.exit(1);
}

// Run conversion
convertToMedGemma(outputDir, split).catch(console.error);