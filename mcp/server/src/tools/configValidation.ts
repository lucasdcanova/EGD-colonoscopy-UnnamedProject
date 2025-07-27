import { z } from "@modelcontextprotocol/sdk/types.js";

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export const validateConfigTool = {
  name: "validate_config",
  description: "Validates project configuration files against MedGemma requirements and best practices",
  inputSchema: z.object({
    configType: z.enum(["model", "training", "deployment", "data"]).describe("Type of configuration to validate"),
    config: z.object({}).describe("Configuration object to validate")
  }),
  handler: async (args: { configType: string; config: any }): Promise<ValidationResult> => {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    switch (args.configType) {
      case "model":
        validateModelConfig(args.config, result);
        break;
      case "training":
        validateTrainingConfig(args.config, result);
        break;
      case "deployment":
        validateDeploymentConfig(args.config, result);
        break;
      case "data":
        validateDataConfig(args.config, result);
        break;
    }

    // Set overall validity
    result.isValid = result.errors.length === 0;

    return result;
  }
};

function validateModelConfig(config: any, result: ValidationResult): void {
  // Required fields
  if (!config.model_name || config.model_name !== "google/medgemma-4b-it") {
    result.errors.push("Model name must be 'google/medgemma-4b-it'");
  }

  // Image size validation
  if (!config.image_size || config.image_size.width !== 896 || config.image_size.height !== 896) {
    result.errors.push("Image size must be 896x896 pixels");
  }

  // Inference parameters
  const inferenceParams = config.inference_params || {};
  
  if (inferenceParams.temperature !== undefined && inferenceParams.temperature !== 1.0) {
    result.warnings.push("Temperature differs from recommended 1.0");
  }
  
  if (inferenceParams.top_k !== undefined && inferenceParams.top_k !== 64) {
    result.warnings.push("top_k differs from recommended 64");
  }
  
  if (inferenceParams.top_p !== undefined && inferenceParams.top_p !== 0.95) {
    result.warnings.push("top_p differs from recommended 0.95");
  }

  // Memory requirements
  if (!config.memory_requirements) {
    result.errors.push("Memory requirements must be specified");
  } else {
    const vram = parseInt(config.memory_requirements.vram_gb);
    if (vram < 16) {
      result.errors.push("Minimum 16GB VRAM required for FP16 inference");
    }
  }

  // Suggestions
  if (!config.quantization) {
    result.suggestions.push("Consider using int8 or int4 quantization to reduce memory requirements");
  }
}

function validateTrainingConfig(config: any, result: ValidationResult): void {
  // QLoRA configuration
  if (!config.lora_config) {
    result.errors.push("LoRA configuration is required for efficient finetuning");
  } else {
    const lora = config.lora_config;
    
    if (lora.r < 8 || lora.r > 64) {
      result.warnings.push(`LoRA rank ${lora.r} is outside recommended range (8-64)`);
    }
    
    if (lora.lora_alpha !== lora.r * 2) {
      result.suggestions.push(`Consider setting lora_alpha to ${lora.r * 2} (2x rank)`);
    }
    
    if (!lora.target_modules || lora.target_modules.length === 0) {
      result.errors.push("target_modules must include at least ['q_proj', 'v_proj']");
    }
  }

  // Training arguments
  if (!config.training_args) {
    result.errors.push("Training arguments are required");
  } else {
    const args = config.training_args;
    
    if (args.learning_rate > 5e-4) {
      result.warnings.push("Learning rate seems high for finetuning, consider 2e-4 or lower");
    }
    
    if (!args.gradient_checkpointing) {
      result.warnings.push("Enable gradient_checkpointing to reduce memory usage");
    }
    
    if (args.per_device_train_batch_size > 4) {
      result.warnings.push("Batch size > 4 may cause OOM with MedGemma 4B");
    }
    
    if (!args.bf16 && !args.fp16) {
      result.errors.push("Either bf16 or fp16 must be enabled for training");
    }
  }

  // Dataset requirements
  if (!config.dataset) {
    result.errors.push("Dataset configuration is required");
  } else {
    if (config.dataset.train_samples < 2000) {
      result.errors.push("Minimum 2000 training samples required for medical applications");
    }
    
    if (!config.dataset.validation_split || config.dataset.validation_split < 0.1) {
      result.errors.push("Validation split must be at least 10%");
    }
  }
}

function validateDeploymentConfig(config: any, result: ValidationResult): void {
  // Container configuration
  if (!config.container) {
    result.errors.push("Container configuration is required");
  } else {
    if (!config.container.base_image?.includes("cuda") && !config.container.base_image?.includes("pytorch")) {
      result.warnings.push("Base image should include CUDA support for GPU inference");
    }
    
    if (!config.container.health_check_endpoint) {
      result.errors.push("Health check endpoint is required for production deployment");
    }
  }

  // Resource allocation
  if (!config.resources) {
    result.errors.push("Resource configuration is required");
  } else {
    const gpu = config.resources.gpu;
    if (!gpu || !gpu.type) {
      result.errors.push("GPU specification is required");
    } else {
      const supportedGPUs = ["A100", "A6000", "V100", "T4", "RTX4090", "RTX3090"];
      if (!supportedGPUs.some(g => gpu.type.includes(g))) {
        result.warnings.push(`GPU ${gpu.type} not in recommended list: ${supportedGPUs.join(", ")}`);
      }
    }
    
    if (!config.resources.memory_gb || config.resources.memory_gb < 32) {
      result.warnings.push("Recommend at least 32GB system RAM for production");
    }
  }

  // API configuration
  if (!config.api) {
    result.errors.push("API configuration is required");
  } else {
    if (!config.api.max_request_size) {
      result.warnings.push("Consider setting max_request_size to prevent large payload attacks");
    }
    
    if (!config.api.timeout_seconds || config.api.timeout_seconds > 30) {
      result.warnings.push("API timeout should be <= 30 seconds for good UX");
    }
    
    if (!config.api.rate_limiting) {
      result.errors.push("Rate limiting must be configured for production");
    }
  }

  // Monitoring
  if (!config.monitoring) {
    result.errors.push("Monitoring configuration is required for production");
  } else {
    const requiredMetrics = ["latency", "throughput", "error_rate", "gpu_utilization"];
    const missingMetrics = requiredMetrics.filter(m => !config.monitoring.metrics?.includes(m));
    
    if (missingMetrics.length > 0) {
      result.warnings.push(`Missing recommended metrics: ${missingMetrics.join(", ")}`);
    }
  }
}

function validateDataConfig(config: any, result: ValidationResult): void {
  // Image specifications
  if (!config.image_specs) {
    result.errors.push("Image specifications are required");
  } else {
    if (config.image_specs.width !== 896 || config.image_specs.height !== 896) {
      result.errors.push("Images must be 896x896 pixels for MedGemma");
    }
    
    if (config.image_specs.channels !== 3) {
      result.errors.push("Images must be RGB (3 channels)");
    }
    
    const validFormats = ["JPEG", "JPG", "PNG"];
    if (!config.image_specs.formats?.some((f: string) => validFormats.includes(f.toUpperCase()))) {
      result.warnings.push(`Recommended formats: ${validFormats.join(", ")}`);
    }
  }

  // Annotation format
  if (!config.annotation_format) {
    result.errors.push("Annotation format must be specified");
  } else {
    if (!config.annotation_format.type?.includes("COCO")) {
      result.warnings.push("COCO format is recommended for compatibility");
    }
    
    const requiredFields = ["image_id", "category_id", "bbox"];
    const missingFields = requiredFields.filter(f => !config.annotation_format.fields?.includes(f));
    
    if (missingFields.length > 0) {
      result.errors.push(`Missing required annotation fields: ${missingFields.join(", ")}`);
    }
  }

  // Data quality
  if (!config.quality_control) {
    result.warnings.push("Quality control measures should be specified");
  } else {
    if (!config.quality_control.min_image_quality) {
      result.suggestions.push("Define minimum image quality standards");
    }
    
    if (!config.quality_control.annotation_review) {
      result.warnings.push("Annotation review process should be defined");
    }
  }

  // Privacy compliance
  if (!config.privacy) {
    result.errors.push("Privacy configuration is required for medical data");
  } else {
    if (!config.privacy.anonymization) {
      result.errors.push("Anonymization must be enabled for medical images");
    }
    
    if (!config.privacy.exif_removal) {
      result.errors.push("EXIF metadata removal must be enabled");
    }
    
    if (!config.privacy.encryption_at_rest) {
      result.errors.push("Encryption at rest is required for HIPAA/LGPD compliance");
    }
  }

  // Storage
  if (!config.storage) {
    result.errors.push("Storage configuration is required");
  } else {
    if (!config.storage.retention_days) {
      result.warnings.push("Data retention policy should be specified");
    }
    
    if (!config.storage.backup_enabled) {
      result.errors.push("Backup must be enabled for medical data");
    }
  }
}